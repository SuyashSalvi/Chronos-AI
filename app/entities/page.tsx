import type { Metadata } from "next";
import { EntitiesExperience } from "./EntitiesExperience";

export const metadata: Metadata = {
  title: "Entities | Chronos AI",
  description: "Live historical entity records from Chronos AI.",
};

export default function EntitiesPage() {
  return <EntitiesExperience />;
}
