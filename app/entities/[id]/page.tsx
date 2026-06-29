import { EntityProfileExperience } from "./EntityProfileExperience";

type EntityProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EntityProfilePage({ params }: EntityProfilePageProps) {
  const { id } = await params;
  return <EntityProfileExperience entityId={id} />;
}
