import type { Metadata } from "next";
import { TimelineExperience } from "./TimelineExperience";

export const metadata: Metadata = {
  title: "Timeline | Chronos AI",
  description: "Reusable Chronos AI timeline components for historical event exploration.",
};

export default function TimelinePage() {
  return <TimelineExperience />;
}
