import { loadCuratedScenario } from "../curatedSeed";
import type { PoolClient } from "pg";

export async function loadWw1Scenario(client: PoolClient): Promise<void> {
  await loadCuratedScenario(client, {
    name: "World War I",
    description: "Historical scenario centered on World War I, its alliances, states, leaders, battles, crises, and settlements.",
    startYear: 1914,
    endYear: 1919,
    entityQids: [
      "Q361", // World War I
      "Q215669", // Allies of World War I
      "Q152283", // Central Powers
      "Q43287", // German Empire
      "Q28513", // Austria-Hungary
      "Q12560", // Ottoman Empire
      "Q34266", // Russian Empire
      "Q8680", // British Empire
      "Q70802", // French Third Republic
      "Q172579", // Kingdom of Italy
      "Q30", // United States
      "Q403", // Serbia
      "Q34296", // Woodrow Wilson
      "Q134982", // David Lloyd George
      "Q171730", // Georges Clemenceau
      "Q2667", // Paul von Hindenburg
      "Q58579", // Erich Ludendorff
    ],
    eventQids: [
      "Q192050", // Assassination of Archduke Franz Ferdinand
      "Q917435", // July Crisis
      "Q130847", // Battle of Verdun
      "Q132568", // Battle of the Somme
      "Q8729", // Russian Revolution
      "Q253224", // Armistice of 11 November 1918
      "Q8736", // Treaty of Versailles
    ],
    entityOverrides: {
      Q361: { entityType: "war" },
      Q215669: { entityType: "alliance", wikipediaTitle: "Allies of World War I" },
      Q152283: { entityType: "alliance" },
      Q34296: { entityType: "person" },
      Q134982: { entityType: "person" },
      Q171730: { entityType: "person" },
      Q2667: { entityType: "person" },
      Q58579: { entityType: "person" },
    },
    relationships: [
      ["German Empire", "Central Powers", "member_of"],
      ["Austria–Hungary", "Central Powers", "member_of"],
      ["Ottoman Empire", "Central Powers", "member_of"],
      ["British Empire", "Allies of the First World War", "member_of"],
      ["French Third Republic", "Allies of the First World War", "member_of"],
      ["Russian Empire", "Allies of the First World War", "member_of"],
      ["United States", "Allies of the First World War", "member_of"],
      ["Kingdom of Italy", "Allies of the First World War", "member_of"],
      ["Woodrow Wilson", "United States", "led"],
      ["David Lloyd George", "British Empire", "led"],
      ["Georges Clemenceau", "French Third Republic", "led"],
      ["Erich Ludendorff", "German Empire", "commanded"],
    ],
  });
}
