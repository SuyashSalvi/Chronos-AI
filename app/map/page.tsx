import type { Metadata } from "next";
import { MapExperience } from "./MapExperience";

export const metadata: Metadata = {
  title: "Map | Chronos AI",
  description: "Geographic Chronos AI map for historical events and entities.",
};

export default function MapPage() {
  return <MapExperience />;
}
