#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ChronosApiStack } from "../lib/chronos-api-stack";

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID ?? app.node.tryGetContext("account");
const region = process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? app.node.tryGetContext("region") ?? "us-east-1";

new ChronosApiStack(app, "ChronosApiStack", {
  env: {
    account,
    region,
  },
});
