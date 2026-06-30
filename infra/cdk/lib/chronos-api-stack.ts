import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const CHRONOS_VPC_ID = "vpc-06c7f7bc511189939";
const CHRONOS_DB_SECURITY_GROUP_ID = "sg-0afc097642472c5f5";

function lambdaSubnetType(value?: string): ec2.SubnetType {
  switch (value) {
    case "PRIVATE_WITH_EGRESS":
      return ec2.SubnetType.PRIVATE_WITH_EGRESS;
    case "PRIVATE_ISOLATED":
      return ec2.SubnetType.PRIVATE_ISOLATED;
    case "PUBLIC":
      return ec2.SubnetType.PUBLIC;
    default:
      return ec2.SubnetType.PUBLIC;
  }
}

export class ChronosApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const databaseUrl = process.env.DATABASE_URL ?? this.node.tryGetContext("databaseUrl") ?? "";
    const subnetType = lambdaSubnetType(process.env.CHRONOS_LAMBDA_SUBNET_TYPE ?? this.node.tryGetContext("lambdaSubnetType"));
    const vpc = ec2.Vpc.fromLookup(this, "ChronosVpc", {
      vpcId: CHRONOS_VPC_ID,
    });
    const lambdaSg = new ec2.SecurityGroup(this, "ChronosLambdaSg", {
      vpc,
      allowAllOutbound: true,
      description: "Security group for Chronos API Lambda functions.",
    });
    const dbSg = ec2.SecurityGroup.fromSecurityGroupId(this, "ChronosDbSg", CHRONOS_DB_SECURITY_GROUP_ID);

    dbSg.addIngressRule(lambdaSg, ec2.Port.tcp(5432), "Allow Chronos Lambda to Aurora PostgreSQL");

    const lambdaDefaults = {
      projectRoot: path.join(__dirname, "../../.."),
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
      vpc,
      vpcSubnets: {
        subnetType,
      },
      allowPublicSubnet: subnetType === ec2.SubnetType.PUBLIC,
      securityGroups: [lambdaSg],
      environment: {
        DATABASE_URL: databaseUrl,
        DB_SSL: process.env.DB_SSL ?? "true",
        DB_POOL_MAX: process.env.DB_POOL_MAX ?? "2",
        CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
      },
    };

    const entitiesFunction = new NodejsFunction(this, "EntitiesFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../../../services/api/entities/handler.ts"),
      handler: "handler",
    });

    const eventsFunction = new NodejsFunction(this, "EventsFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../../../services/api/events/handler.ts"),
      handler: "handler",
    });

    const scenariosFunction = new NodejsFunction(this, "ScenariosFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../../../services/api/scenarios/handler.ts"),
      handler: "handler",
    });

    const mapMarkersFunction = new NodejsFunction(this, "MapMarkersFunction", {
      ...lambdaDefaults,
      entry: path.join(__dirname, "../../../services/api/map/markers/handler.ts"),
      handler: "handler",
    });

    const api = new apigateway.RestApi(this, "ChronosApi", {
      restApiName: "chronos-api",
      description: "Chronos AI production API Gateway.",
      defaultCorsPreflightOptions: {
        allowOrigins: [process.env.CORS_ORIGIN ?? "*"],
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["content-type", "authorization"],
      },
      deployOptions: {
        stageName: process.env.CHRONOS_API_STAGE ?? "prod",
      },
    });

    api.root.addResource("entities").addMethod("GET", new apigateway.LambdaIntegration(entitiesFunction));

    const events = api.root.addResource("events");
    events.addMethod("GET", new apigateway.LambdaIntegration(eventsFunction));

    const eventById = events.addResource("{id}");
    eventById.addMethod("GET", new apigateway.LambdaIntegration(eventsFunction));
    eventById.addResource("entities").addMethod("GET", new apigateway.LambdaIntegration(eventsFunction));

    api.root.addResource("timeline").addMethod("GET", new apigateway.LambdaIntegration(eventsFunction));

    const scenarios = api.root.addResource("scenarios");
    scenarios.addMethod("GET", new apigateway.LambdaIntegration(scenariosFunction));

    scenarios.addResource("load").addMethod("POST", new apigateway.LambdaIntegration(scenariosFunction));
    scenarios.addResource("{id}").addMethod("GET", new apigateway.LambdaIntegration(scenariosFunction));

    const map = api.root.addResource("map");
    map.addResource("markers").addMethod("GET", new apigateway.LambdaIntegration(mapMarkersFunction));

    new CfnOutput(this, "ChronosApiUrl", {
      value: api.url,
      description: "Base URL for NEXT_PUBLIC_API_BASE_URL.",
    });
  }
}
