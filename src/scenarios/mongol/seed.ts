import { loadCuratedScenario } from "../curatedSeed";
import type { PoolClient } from "pg";

export async function loadMongolScenario(client: PoolClient): Promise<void> {
  await loadCuratedScenario(client, {
    name: "Mongol Empire",
    description: "Historical scenario centered on the Mongol Empire, its rulers, successor khanates, conquests, and Eurasian networks.",
    startYear: 1206,
    endYear: 1368,
    entityQids: [
      "Q12557", // Mongol Empire
      "Q720", // Genghis Khan
      "Q7523", // Kublai Khan
      "Q162217", // Subutai
      "Q41975", // Mongols
      "Q79965", // Golden Horde
      "Q178084", // Ilkhanate
      "Q487829", // Chagatai Khanate
      "Q7313", // Yuan dynasty
      "Q62677", // Karakorum
      "Q5753", // Samarkand
      "Q63134381", // Khwarazmian Empire
      "Q7462", // Song dynasty
      "Q5066", // Jin dynasty
      "Q1108445", // Kievan Rus'
    ],
    eventQids: [
      "Q852171", // Mongol invasion of Europe
      "Q208156", // Mongol invasions of Japan
      "Q244356", // Battle of Ain Jalut
      "Q1473258", // Pax Mongolica
      "Q20987562", // Division of the Mongol Empire
    ],
    entityOverrides: {
      Q720: { entityType: "person" },
      Q7523: { entityType: "person" },
      Q162217: { entityType: "person" },
      Q41975: { entityType: "group" },
      Q62677: { entityType: "city" },
      Q5753: { entityType: "city" },
    },
    relationships: [
      ["Genghis Khan", "Mongol Empire", "founded"],
      ["Genghis Khan", "Mongol Empire", "ruled"],
      ["Subutai", "Mongol Empire", "served"],
      ["Kublai Khan", "Yuan dynasty", "ruled"],
      ["Mongol Empire", "Golden Horde", "split_into"],
      ["Mongol Empire", "Ilkhanate", "split_into"],
      ["Mongol Empire", "Chagatai Khanate", "split_into"],
      ["Mongol Empire", "Yuan dynasty", "split_into"],
    ],
  });
}
