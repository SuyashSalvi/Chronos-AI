import { EntityGraphExperience } from "./EntityGraphExperience";

type EntityGraphPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EntityGraphPage({ params }: EntityGraphPageProps) {
  const { id } = await params;
  return <EntityGraphExperience entityId={id} />;
}
