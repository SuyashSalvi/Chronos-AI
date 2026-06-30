import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { linkEntitySource, linkEventSource, upsertSource } from "../services/source-attribution";

type LocalEntity = {
  key: string;
  name: string;
  entityType: string;
  summary: string;
  latitude?: number;
  longitude?: number;
  startYear?: number;
  endYear?: number;
};

type LocalEvent = {
  key: string;
  name: string;
  eventType: string;
  description: string;
  startYear: number;
  endYear?: number;
  latitude?: number;
  longitude?: number;
};

type LocalScenarioConfig = {
  slug: string;
  name: string;
  description: string;
  startYear: number;
  endYear: number;
  entities: LocalEntity[];
  events: LocalEvent[];
  relationships?: Array<[string, string, string]>;
};

function wikipediaUrl(title: string) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function manualId(slug: string, key: string) {
  return `manual:${slug}:${key}`;
}

async function upsertScenario(client: PoolClient, config: LocalScenarioConfig): Promise<string> {
  const existing = await client.query<{ scenario_id: string }>(
    `
    SELECT scenario_id
    FROM scenarios
    WHERE name = $1
    ORDER BY created_at
    LIMIT 1
    `,
    [config.name]
  );

  if (existing.rows[0]) {
    await client.query(
      `
      UPDATE scenarios
      SET description = $2, start_year = $3, end_year = $4
      WHERE scenario_id = $1
      `,
      [existing.rows[0].scenario_id, config.description, config.startYear, config.endYear]
    );

    return existing.rows[0].scenario_id;
  }

  const scenarioId = randomUUID();
  await client.query(
    `
    INSERT INTO scenarios (scenario_id, name, description, start_year, end_year)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [scenarioId, config.name, config.description, config.startYear, config.endYear]
  );

  return scenarioId;
}

export async function loadLocalScenario(client: PoolClient, config: LocalScenarioConfig): Promise<void> {
  const scenarioId = await upsertScenario(client, config);
  const entityNameToId = new Map<string, string>();

  for (const entity of config.entities) {
    const sourceUrl = wikipediaUrl(entity.name);
    const result = await client.query<{ entity_id: string }>(
      `
      INSERT INTO entities (
        entity_id,
        scenario_id,
        wikidata_id,
        name,
        entity_type,
        summary,
        start_year,
        end_year,
        latitude,
        longitude,
        metadata_json,
        wikipedia_url,
        wikipedia_summary,
        wikipedia_last_updated
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (scenario_id, wikidata_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        entity_type = EXCLUDED.entity_type,
        summary = EXCLUDED.summary,
        start_year = EXCLUDED.start_year,
        end_year = EXCLUDED.end_year,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        metadata_json = EXCLUDED.metadata_json,
        wikipedia_url = EXCLUDED.wikipedia_url,
        wikipedia_summary = EXCLUDED.wikipedia_summary,
        wikipedia_last_updated = NOW()
      RETURNING entity_id
      `,
      [
        randomUUID(),
        scenarioId,
        manualId(config.slug, entity.key),
        entity.name,
        entity.entityType,
        entity.summary,
        entity.startYear ?? null,
        entity.endYear ?? null,
        entity.latitude ?? null,
        entity.longitude ?? null,
        { source: "curated_seed", scenario_slug: config.slug },
        sourceUrl,
        entity.summary,
      ]
    );

    const sourceId = await upsertSource(client, {
      sourceType: "curated_seed",
      sourceUrl,
      title: entity.name,
      metadata: { scenario_slug: config.slug },
    });

    const entityId = result.rows[0].entity_id;
    await linkEntitySource(client, entityId, sourceId);
    entityNameToId.set(entity.name, entityId);
  }

  for (const event of config.events) {
    const sourceUrl = wikipediaUrl(event.name);
    const result = await client.query<{ event_id: string }>(
      `
      INSERT INTO events (
        event_id,
        scenario_id,
        wikidata_id,
        name,
        description,
        event_type,
        start_year,
        end_year,
        latitude,
        longitude,
        source_url,
        source_metadata,
        wikipedia_url,
        wikipedia_summary,
        wikipedia_last_updated
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      ON CONFLICT (scenario_id, wikidata_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        event_type = EXCLUDED.event_type,
        start_year = EXCLUDED.start_year,
        end_year = EXCLUDED.end_year,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        source_url = EXCLUDED.source_url,
        source_metadata = EXCLUDED.source_metadata,
        wikipedia_url = EXCLUDED.wikipedia_url,
        wikipedia_summary = EXCLUDED.wikipedia_summary,
        wikipedia_last_updated = NOW()
      RETURNING event_id
      `,
      [
        randomUUID(),
        scenarioId,
        manualId(config.slug, event.key),
        event.name,
        event.description,
        event.eventType,
        event.startYear,
        event.endYear ?? null,
        event.latitude ?? null,
        event.longitude ?? null,
        sourceUrl,
        { source: "curated_seed", scenario_slug: config.slug },
        sourceUrl,
        event.description,
      ]
    );

    const sourceId = await upsertSource(client, {
      sourceType: "curated_seed",
      sourceUrl,
      title: event.name,
      metadata: { scenario_slug: config.slug },
    });

    await linkEventSource(client, result.rows[0].event_id, sourceId);
  }

  for (const [sourceName, targetName, relationshipType] of config.relationships ?? []) {
    const sourceId = entityNameToId.get(sourceName);
    const targetId = entityNameToId.get(targetName);

    if (!sourceId || !targetId) continue;

    await client.query(
      `
      INSERT INTO relationships (
        relationship_id,
        scenario_id,
        source_entity_id,
        target_entity_id,
        relationship_type,
        confidence_score,
        source_metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (scenario_id, source_entity_id, target_entity_id, relationship_type)
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        source_metadata = EXCLUDED.source_metadata
      `,
      [
        randomUUID(),
        scenarioId,
        sourceId,
        targetId,
        relationshipType,
        0.75,
        { sources: [{ type: "curated_seed", url: "local://chronos/scenario-seeds" }] },
      ]
    );
  }

  console.log(`${config.name} ingestion complete.`);
  console.log(`Entities seeded: ${config.entities.length}`);
  console.log(`Events seeded: ${config.events.length}`);
}

const scenarioPacks: LocalScenarioConfig[] = [
  {
    slug: "ancient-egypt",
    name: "Ancient Egypt",
    description: "Pharaonic Egypt from early dynastic unification through the Ptolemaic period.",
    startYear: -3100,
    endYear: -30,
    entities: [
      { key: "egypt", name: "Ancient Egypt", entityType: "civilization", summary: "Ancient Egypt was a Nile Valley civilization organized around pharaonic kingship, monumental building, temple institutions, and long-distance trade.", latitude: 26.8, longitude: 30.8, startYear: -3100, endYear: -30 },
      { key: "memphis", name: "Memphis, Egypt", entityType: "city", summary: "Memphis was an early royal capital near the Nile Delta and a major administrative and religious center.", latitude: 29.85, longitude: 31.25 },
      { key: "ramses", name: "Ramesses II", entityType: "person", summary: "Ramesses II was a New Kingdom pharaoh associated with major building programs, diplomacy, and campaigns in the Levant.", latitude: 25.72, longitude: 32.61 },
      { key: "cleopatra", name: "Cleopatra", entityType: "person", summary: "Cleopatra VII ruled Ptolemaic Egypt and became central to the late Roman Republic's eastern politics.", latitude: 31.2, longitude: 29.92 },
    ],
    events: [
      { key: "unification", name: "Unification of Upper and Lower Egypt", eventType: "politics", description: "Early dynastic rulers consolidated the Nile Valley into a durable pharaonic state.", startYear: -3100, latitude: 29.85, longitude: 31.25 },
      { key: "giza", name: "Construction of the Great Pyramid of Giza", eventType: "cultural", description: "The Great Pyramid became a central monument of Old Kingdom royal power and labor organization.", startYear: -2580, endYear: -2560, latitude: 29.98, longitude: 31.13 },
      { key: "kadesh", name: "Battle of Kadesh", eventType: "battle", description: "Egyptian and Hittite forces fought near Kadesh in one of the best documented Bronze Age battles.", startYear: -1274, latitude: 34.56, longitude: 36.52 },
      { key: "amarna", name: "Amarna Period", eventType: "reform", description: "Akhenaten promoted a disruptive religious and political reorientation centered on Aten worship.", startYear: -1353, endYear: -1336, latitude: 27.65, longitude: 30.9 },
      { key: "roman-annexation", name: "Roman annexation of Egypt", eventType: "politics", description: "After the defeat of Cleopatra and Mark Antony, Egypt became a Roman province.", startYear: -30, latitude: 31.2, longitude: 29.92 },
    ],
    relationships: [["Ramesses II", "Ancient Egypt", "ruled"], ["Cleopatra", "Ancient Egypt", "ruled"]],
  },
  {
    slug: "ancient-greece",
    name: "Ancient Greece",
    description: "Greek city-states, classical culture, Persian wars, and Hellenistic expansion.",
    startYear: -800,
    endYear: -146,
    entities: [
      { key: "greece", name: "Ancient Greece", entityType: "civilization", summary: "Ancient Greece was a network of city-states whose politics, warfare, philosophy, and art shaped Mediterranean history.", latitude: 37.98, longitude: 23.73 },
      { key: "athens", name: "Athens", entityType: "city", summary: "Athens was a major Greek polis known for democracy, naval power, drama, and philosophy.", latitude: 37.98, longitude: 23.73 },
      { key: "sparta", name: "Sparta", entityType: "city", summary: "Sparta was a militarized Greek polis that led the Peloponnesian League.", latitude: 37.07, longitude: 22.43 },
      { key: "pericles", name: "Pericles", entityType: "person", summary: "Pericles was an Athenian statesman associated with democratic leadership and major building projects.", latitude: 37.98, longitude: 23.73 },
    ],
    events: [
      { key: "marathon", name: "Battle of Marathon", eventType: "battle", description: "Athens and Plataea defeated a Persian expeditionary force in Attica.", startYear: -490, latitude: 38.15, longitude: 24.0 },
      { key: "thermopylae", name: "Battle of Thermopylae", eventType: "battle", description: "A Greek force led by Sparta delayed Xerxes' invasion at a narrow pass.", startYear: -480, latitude: 38.8, longitude: 22.54 },
      { key: "salamis", name: "Battle of Salamis", eventType: "battle", description: "The Greek fleet defeated Persia in a decisive naval battle near Athens.", startYear: -480, latitude: 37.95, longitude: 23.53 },
      { key: "peloponnesian", name: "Peloponnesian War", eventType: "war", description: "Athens and Sparta led rival alliances in a long conflict that reshaped the Greek world.", startYear: -431, endYear: -404, latitude: 37.98, longitude: 23.73 },
      { key: "corinth", name: "Roman conquest of Greece", eventType: "politics", description: "Rome's destruction of Corinth marked the subordination of mainland Greece to Roman power.", startYear: -146, latitude: 37.91, longitude: 22.88 },
    ],
    relationships: [["Athens", "Ancient Greece", "part_of"], ["Sparta", "Ancient Greece", "part_of"], ["Pericles", "Athens", "led"]],
  },
  {
    slug: "persian-empire",
    name: "Achaemenid Persian Empire",
    description: "The first Persian Empire from Cyrus the Great to Alexander's conquest.",
    startYear: -550,
    endYear: -330,
    entities: [
      { key: "empire", name: "Achaemenid Empire", entityType: "empire", summary: "The Achaemenid Empire was a vast Persian imperial state connecting Iran, Mesopotamia, Egypt, Anatolia, and Central Asia.", latitude: 29.94, longitude: 52.89 },
      { key: "cyrus", name: "Cyrus the Great", entityType: "person", summary: "Cyrus the Great founded the Achaemenid Empire through conquests and imperial integration.", latitude: 30.19, longitude: 53.18 },
      { key: "darius", name: "Darius the Great", entityType: "person", summary: "Darius I reorganized Persian administration, taxation, roads, and monumental royal display.", latitude: 29.94, longitude: 52.89 },
      { key: "persepolis", name: "Persepolis", entityType: "city", summary: "Persepolis was a ceremonial capital of the Achaemenid Empire.", latitude: 29.94, longitude: 52.89 },
    ],
    events: [
      { key: "founding", name: "Founding of the Achaemenid Empire", eventType: "politics", description: "Cyrus the Great overthrew Median power and built a new Persian empire.", startYear: -550, latitude: 30.19, longitude: 53.18 },
      { key: "babylon", name: "Fall of Babylon to Cyrus", eventType: "battle", description: "Cyrus captured Babylon, extending Persian rule into Mesopotamia.", startYear: -539, latitude: 32.54, longitude: 44.42 },
      { key: "ionian", name: "Ionian Revolt", eventType: "revolt", description: "Greek cities in Asia Minor rebelled against Persian rule.", startYear: -499, endYear: -493, latitude: 37.95, longitude: 27.37 },
      { key: "xerxes", name: "Second Persian invasion of Greece", eventType: "invasion", description: "Xerxes led a massive campaign into Greece after earlier Persian setbacks.", startYear: -480, latitude: 38.8, longitude: 22.54 },
      { key: "gaugamela", name: "Battle of Gaugamela", eventType: "battle", description: "Alexander defeated Darius III, breaking Achaemenid imperial power.", startYear: -331, latitude: 36.36, longitude: 43.25 },
    ],
    relationships: [["Cyrus the Great", "Achaemenid Empire", "founded"], ["Darius the Great", "Achaemenid Empire", "ruled"], ["Persepolis", "Achaemenid Empire", "capital_of"]],
  },
  {
    slug: "alexander",
    name: "Alexander the Great",
    description: "Macedonian conquest from Greece through Egypt, Persia, and northwest India.",
    startYear: -336,
    endYear: -323,
    entities: [
      { key: "alexander", name: "Alexander the Great", entityType: "person", summary: "Alexander III of Macedon led one of antiquity's largest military expansions.", latitude: 40.52, longitude: 22.2 },
      { key: "macedon", name: "Macedonia", entityType: "kingdom", summary: "Macedonia became the dominant Greek power under Philip II and Alexander.", latitude: 40.52, longitude: 22.2 },
      { key: "alexandria", name: "Alexandria", entityType: "city", summary: "Alexandria in Egypt was founded by Alexander and became a major Hellenistic city.", latitude: 31.2, longitude: 29.92 },
      { key: "darius", name: "Darius III", entityType: "person", summary: "Darius III was the last Achaemenid king defeated by Alexander.", latitude: 36.36, longitude: 43.25 },
    ],
    events: [
      { key: "granicus", name: "Battle of the Granicus", eventType: "battle", description: "Alexander won his first major battle against Persian forces in Asia Minor.", startYear: -334, latitude: 40.3, longitude: 27.3 },
      { key: "issus", name: "Battle of Issus", eventType: "battle", description: "Alexander defeated Darius III in southern Anatolia.", startYear: -333, latitude: 36.85, longitude: 36.17 },
      { key: "tyre", name: "Siege of Tyre", eventType: "battle", description: "Alexander captured Tyre after a difficult island siege.", startYear: -332, latitude: 33.27, longitude: 35.2 },
      { key: "alexandria-founded", name: "Founding of Alexandria", eventType: "politics", description: "Alexander founded Alexandria on Egypt's Mediterranean coast.", startYear: -331, latitude: 31.2, longitude: 29.92 },
      { key: "hydaspes", name: "Battle of the Hydaspes", eventType: "battle", description: "Alexander fought King Porus in the Punjab before his army turned back.", startYear: -326, latitude: 32.83, longitude: 73.64 },
    ],
    relationships: [["Alexander the Great", "Macedonia", "ruled"], ["Alexander the Great", "Alexandria", "founded"], ["Alexander the Great", "Darius III", "defeated"]],
  },
  {
    slug: "han-china",
    name: "Han China",
    description: "The Han dynasty's imperial consolidation, Silk Road expansion, and political crises.",
    startYear: -202,
    endYear: 220,
    entities: [
      { key: "han", name: "Han dynasty", entityType: "dynasty", summary: "The Han dynasty consolidated imperial Chinese institutions and expanded trade and military frontiers.", latitude: 34.34, longitude: 108.94 },
      { key: "liu-bang", name: "Emperor Gaozu of Han", entityType: "person", summary: "Liu Bang founded the Han dynasty after the fall of Qin and the Chu-Han Contention.", latitude: 34.34, longitude: 108.94 },
      { key: "wudi", name: "Emperor Wu of Han", entityType: "person", summary: "Emperor Wu expanded Han power and patronized Confucian state ideology.", latitude: 34.34, longitude: 108.94 },
      { key: "changan", name: "Chang'an", entityType: "city", summary: "Chang'an was a Han capital and a major Silk Road hub.", latitude: 34.34, longitude: 108.94 },
    ],
    events: [
      { key: "founding", name: "Founding of the Han dynasty", eventType: "politics", description: "Liu Bang became emperor and established Han rule after civil war.", startYear: -202, latitude: 34.34, longitude: 108.94 },
      { key: "zhang-qian", name: "Zhang Qian's mission to the Western Regions", eventType: "diplomacy", description: "Han missions helped open durable trans-Eurasian contacts later associated with the Silk Road.", startYear: -138, latitude: 34.34, longitude: 108.94 },
      { key: "xiongnu", name: "Han-Xiongnu War", eventType: "war", description: "Han campaigns contested steppe power and trade routes with the Xiongnu confederation.", startYear: -133, endYear: 89, latitude: 40.82, longitude: 111.65 },
      { key: "xin", name: "Wang Mang usurpation", eventType: "politics", description: "Wang Mang interrupted Han rule with the short-lived Xin dynasty.", startYear: 9, latitude: 34.34, longitude: 108.94 },
      { key: "yellow-turban", name: "Yellow Turban Rebellion", eventType: "revolt", description: "A massive rebellion weakened late Han authority and accelerated fragmentation.", startYear: 184, latitude: 35.0, longitude: 114.0 },
    ],
    relationships: [["Emperor Gaozu of Han", "Han dynasty", "founded"], ["Emperor Wu of Han", "Han dynasty", "ruled"], ["Chang'an", "Han dynasty", "capital_of"]],
  },
  {
    slug: "mauryan-empire",
    name: "Mauryan Empire",
    description: "Early Indian imperial state formation from Chandragupta to Ashoka.",
    startYear: -322,
    endYear: -185,
    entities: [
      { key: "maurya", name: "Maurya Empire", entityType: "empire", summary: "The Maurya Empire was a major South Asian imperial state centered on the Gangetic plain.", latitude: 25.61, longitude: 85.14 },
      { key: "chandragupta", name: "Chandragupta Maurya", entityType: "person", summary: "Chandragupta Maurya founded the Mauryan Empire after overthrowing Nanda rule.", latitude: 25.61, longitude: 85.14 },
      { key: "ashoka", name: "Ashoka", entityType: "person", summary: "Ashoka expanded Mauryan power and promoted Buddhist moral governance after the Kalinga War.", latitude: 25.61, longitude: 85.14 },
      { key: "pataliputra", name: "Pataliputra", entityType: "city", summary: "Pataliputra was the Mauryan capital and a major administrative center.", latitude: 25.61, longitude: 85.14 },
    ],
    events: [
      { key: "founding", name: "Founding of the Maurya Empire", eventType: "politics", description: "Chandragupta Maurya established a large imperial state in northern India.", startYear: -322, latitude: 25.61, longitude: 85.14 },
      { key: "seleucid", name: "Seleucid-Mauryan War", eventType: "war", description: "Mauryan and Seleucid forces contested territories after Alexander's successors divided his empire.", startYear: -305, endYear: -303, latitude: 33.94, longitude: 67.71 },
      { key: "kalinga", name: "Kalinga War", eventType: "battle", description: "Ashoka's conquest of Kalinga became a turning point in Mauryan imperial ideology.", startYear: -261, latitude: 20.27, longitude: 85.84 },
      { key: "edicts", name: "Edicts of Ashoka", eventType: "reform", description: "Ashoka's inscriptions publicized royal policy, dhamma, and administrative ideals.", startYear: -260, latitude: 25.61, longitude: 85.14 },
      { key: "decline", name: "Fall of the Maurya Empire", eventType: "collapse", description: "The Mauryan state fragmented after dynastic weakness and regional pressures.", startYear: -185, latitude: 25.61, longitude: 85.14 },
    ],
    relationships: [["Chandragupta Maurya", "Maurya Empire", "founded"], ["Ashoka", "Maurya Empire", "ruled"], ["Pataliputra", "Maurya Empire", "capital_of"]],
  },
  {
    slug: "islamic-golden-age",
    name: "Islamic Golden Age",
    description: "Scientific, philosophical, commercial, and political life in the Abbasid-centered Islamic world.",
    startYear: 750,
    endYear: 1258,
    entities: [
      { key: "abbasid", name: "Abbasid Caliphate", entityType: "caliphate", summary: "The Abbasid Caliphate ruled a vast Islamic empire and patronized scholarship, administration, and trade.", latitude: 33.31, longitude: 44.36 },
      { key: "baghdad", name: "Baghdad", entityType: "city", summary: "Baghdad was the Abbasid capital and a major center of learning and commerce.", latitude: 33.31, longitude: 44.36 },
      { key: "harun", name: "Harun al-Rashid", entityType: "person", summary: "Harun al-Rashid was an Abbasid caliph associated with court culture and imperial prestige.", latitude: 33.31, longitude: 44.36 },
      { key: "khwarizmi", name: "Al-Khwarizmi", entityType: "person", summary: "Al-Khwarizmi was a mathematician and astronomer influential in algebra and computation.", latitude: 33.31, longitude: 44.36 },
    ],
    events: [
      { key: "abbasid-revolution", name: "Abbasid Revolution", eventType: "revolt", description: "The Abbasids overthrew the Umayyads and shifted imperial power eastward.", startYear: 747, endYear: 750, latitude: 36.67, longitude: 59.61 },
      { key: "baghdad-founded", name: "Founding of Baghdad", eventType: "politics", description: "The Abbasids founded Baghdad as a new imperial capital.", startYear: 762, latitude: 33.31, longitude: 44.36 },
      { key: "house-wisdom", name: "House of Wisdom", eventType: "cultural", description: "Baghdad's scholarly institutions supported translation, astronomy, mathematics, and philosophy.", startYear: 830, latitude: 33.31, longitude: 44.36 },
      { key: "mihna", name: "Mihna", eventType: "politics", description: "Abbasid caliphs attempted to impose theological doctrine through an inquisition.", startYear: 833, endYear: 848, latitude: 33.31, longitude: 44.36 },
      { key: "baghdad-sack", name: "Siege of Baghdad", eventType: "battle", description: "Mongol forces captured Baghdad, ending the Abbasid caliphate's political center there.", startYear: 1258, latitude: 33.31, longitude: 44.36 },
    ],
    relationships: [["Baghdad", "Abbasid Caliphate", "capital_of"], ["Harun al-Rashid", "Abbasid Caliphate", "ruled"], ["Al-Khwarizmi", "Baghdad", "worked_in"]],
  },
  {
    slug: "viking-age",
    name: "Viking Age",
    description: "Norse expansion, raiding, settlement, trade, and state formation across the North Atlantic and Europe.",
    startYear: 793,
    endYear: 1066,
    entities: [
      { key: "vikings", name: "Vikings", entityType: "group", summary: "Vikings were Norse seafarers involved in raiding, settlement, trade, and political expansion.", latitude: 59.91, longitude: 10.75 },
      { key: "denmark", name: "Kingdom of Denmark", entityType: "kingdom", summary: "Denmark became a major Viking Age kingdom with influence around the North Sea.", latitude: 55.68, longitude: 12.57 },
      { key: "cnut", name: "Cnut", entityType: "person", summary: "Cnut ruled a North Sea empire including England, Denmark, and Norway.", latitude: 51.51, longitude: -0.13 },
      { key: "dublin", name: "Dublin", entityType: "city", summary: "Dublin developed as a Norse settlement and trading center in Ireland.", latitude: 53.35, longitude: -6.26 },
    ],
    events: [
      { key: "lindisfarne", name: "Raid on Lindisfarne", eventType: "raid", description: "The attack on Lindisfarne monastery became a symbolic opening of the Viking Age.", startYear: 793, latitude: 55.67, longitude: -1.8 },
      { key: "dublin-founded", name: "Norse settlement of Dublin", eventType: "politics", description: "Norse settlers established Dublin as a fortified settlement and trading hub.", startYear: 841, latitude: 53.35, longitude: -6.26 },
      { key: "great-heathen", name: "Great Heathen Army", eventType: "invasion", description: "A large Norse army campaigned across Anglo-Saxon England.", startYear: 865, latitude: 52.19, longitude: -1.71 },
      { key: "england-cnut", name: "Cnut's conquest of England", eventType: "politics", description: "Cnut became king of England and built a North Sea empire.", startYear: 1016, latitude: 51.51, longitude: -0.13 },
      { key: "stamford", name: "Battle of Stamford Bridge", eventType: "battle", description: "An English victory over Harald Hardrada is often treated as the end of the Viking Age.", startYear: 1066, latitude: 53.99, longitude: -0.91 },
    ],
    relationships: [["Cnut", "Kingdom of Denmark", "ruled"], ["Dublin", "Vikings", "settled_by"], ["Vikings", "Kingdom of Denmark", "associated_with"]],
  },
  {
    slug: "medieval-europe",
    name: "Medieval Europe",
    description: "Political, religious, and military transformations in Europe from Charlemagne to the late Middle Ages.",
    startYear: 500,
    endYear: 1500,
    entities: [
      { key: "franks", name: "Frankish Empire", entityType: "empire", summary: "The Frankish Empire became a dominant western European power under the Carolingians.", latitude: 50.78, longitude: 6.08 },
      { key: "charlemagne", name: "Charlemagne", entityType: "person", summary: "Charlemagne expanded Frankish rule and was crowned emperor in 800.", latitude: 50.78, longitude: 6.08 },
      { key: "papacy", name: "Papacy", entityType: "institution", summary: "The medieval papacy was a major religious and political institution in Latin Christendom.", latitude: 41.9, longitude: 12.45 },
      { key: "england", name: "Kingdom of England", entityType: "kingdom", summary: "The Kingdom of England emerged from Anglo-Saxon and Norman political consolidation.", latitude: 51.51, longitude: -0.13 },
    ],
    events: [
      { key: "charlemagne-crowned", name: "Coronation of Charlemagne", eventType: "politics", description: "Pope Leo III crowned Charlemagne emperor in Rome.", startYear: 800, latitude: 41.9, longitude: 12.45 },
      { key: "verdun", name: "Treaty of Verdun", eventType: "treaty", description: "The Carolingian Empire was divided among heirs of Louis the Pious.", startYear: 843, latitude: 49.16, longitude: 5.39 },
      { key: "hastings", name: "Battle of Hastings", eventType: "battle", description: "William of Normandy defeated Harold Godwinson and transformed English rule.", startYear: 1066, latitude: 50.91, longitude: 0.49 },
      { key: "magna-carta", name: "Magna Carta", eventType: "reform", description: "English barons compelled King John to accept limits on royal authority.", startYear: 1215, latitude: 51.44, longitude: -0.57 },
      { key: "black-death", name: "Black Death in Europe", eventType: "crisis", description: "Pandemic mortality reshaped European society, labor, and religious life.", startYear: 1347, endYear: 1351, latitude: 45.46, longitude: 9.19 },
    ],
    relationships: [["Charlemagne", "Frankish Empire", "ruled"], ["Papacy", "Charlemagne", "crowned"], ["Kingdom of England", "Medieval Europe", "part_of"]],
  },
  {
    slug: "crusades",
    name: "The Crusades",
    description: "Latin Christian crusading, eastern Mediterranean states, and conflict over holy places.",
    startYear: 1095,
    endYear: 1291,
    entities: [
      { key: "crusaders", name: "Crusaders", entityType: "group", summary: "Crusaders were Latin Christian participants in armed expeditions authorized by the papacy.", latitude: 41.9, longitude: 12.45 },
      { key: "jerusalem", name: "Jerusalem", entityType: "city", summary: "Jerusalem was a sacred city contested during several crusading campaigns.", latitude: 31.78, longitude: 35.23 },
      { key: "saladin", name: "Saladin", entityType: "person", summary: "Saladin founded the Ayyubid dynasty and recaptured Jerusalem in 1187.", latitude: 33.51, longitude: 36.29 },
      { key: "kingdom", name: "Kingdom of Jerusalem", entityType: "kingdom", summary: "The Kingdom of Jerusalem was a crusader state established after the First Crusade.", latitude: 31.78, longitude: 35.23 },
    ],
    events: [
      { key: "clermont", name: "Council of Clermont", eventType: "politics", description: "Pope Urban II called for armed pilgrimage to the eastern Mediterranean.", startYear: 1095, latitude: 45.78, longitude: 3.09 },
      { key: "first-crusade", name: "First Crusade", eventType: "war", description: "Crusader armies captured Jerusalem and established Latin states.", startYear: 1096, endYear: 1099, latitude: 31.78, longitude: 35.23 },
      { key: "hattin", name: "Battle of Hattin", eventType: "battle", description: "Saladin defeated the crusader army, opening the way to Jerusalem's capture.", startYear: 1187, latitude: 32.8, longitude: 35.45 },
      { key: "third-crusade", name: "Third Crusade", eventType: "war", description: "European rulers campaigned after Saladin's capture of Jerusalem.", startYear: 1189, endYear: 1192, latitude: 32.92, longitude: 35.08 },
      { key: "acre", name: "Fall of Acre", eventType: "battle", description: "The Mamluk capture of Acre ended the last major crusader foothold in the Levant.", startYear: 1291, latitude: 32.92, longitude: 35.08 },
    ],
    relationships: [["Crusaders", "Kingdom of Jerusalem", "founded"], ["Saladin", "Jerusalem", "captured"], ["Jerusalem", "Kingdom of Jerusalem", "capital_of"]],
  },
  {
    slug: "aztec",
    name: "Aztec Empire",
    description: "Mexica imperial expansion and the Spanish conquest of central Mexico.",
    startYear: 1325,
    endYear: 1521,
    entities: [
      { key: "aztec", name: "Aztec Empire", entityType: "empire", summary: "The Aztec Empire was a Mesoamerican imperial alliance centered on Tenochtitlan.", latitude: 19.43, longitude: -99.13 },
      { key: "tenochtitlan", name: "Tenochtitlan", entityType: "city", summary: "Tenochtitlan was the Mexica capital built on an island in Lake Texcoco.", latitude: 19.43, longitude: -99.13 },
      { key: "moctezuma", name: "Moctezuma II", entityType: "person", summary: "Moctezuma II was the Mexica ruler at the time of Spanish arrival.", latitude: 19.43, longitude: -99.13 },
      { key: "cortes", name: "Hernan Cortes", entityType: "person", summary: "Hernan Cortes led the Spanish expedition that conquered the Aztec Empire.", latitude: 19.43, longitude: -99.13 },
    ],
    events: [
      { key: "tenochtitlan-founded", name: "Founding of Tenochtitlan", eventType: "politics", description: "The Mexica founded Tenochtitlan, later the center of Aztec imperial power.", startYear: 1325, latitude: 19.43, longitude: -99.13 },
      { key: "triple-alliance", name: "Aztec Triple Alliance", eventType: "politics", description: "Tenochtitlan, Texcoco, and Tlacopan formed the alliance that became the Aztec Empire.", startYear: 1428, latitude: 19.43, longitude: -99.13 },
      { key: "spanish-arrival", name: "Spanish arrival in Tenochtitlan", eventType: "contact", description: "Cortes entered Tenochtitlan and met Moctezuma II.", startYear: 1519, latitude: 19.43, longitude: -99.13 },
      { key: "noche-triste", name: "La Noche Triste", eventType: "battle", description: "Spanish forces fled Tenochtitlan after an uprising against them.", startYear: 1520, latitude: 19.43, longitude: -99.13 },
      { key: "fall", name: "Fall of Tenochtitlan", eventType: "battle", description: "Spanish and allied Indigenous forces captured Tenochtitlan.", startYear: 1521, latitude: 19.43, longitude: -99.13 },
    ],
    relationships: [["Tenochtitlan", "Aztec Empire", "capital_of"], ["Moctezuma II", "Aztec Empire", "ruled"], ["Hernan Cortes", "Aztec Empire", "conquered"]],
  },
  {
    slug: "inca",
    name: "Inca Empire",
    description: "Andean imperial expansion and the Spanish conquest of Tawantinsuyu.",
    startYear: 1438,
    endYear: 1572,
    entities: [
      { key: "inca", name: "Inca Empire", entityType: "empire", summary: "The Inca Empire was a large Andean state organized through roads, labor obligations, and provincial administration.", latitude: -13.52, longitude: -71.98 },
      { key: "cusco", name: "Cusco", entityType: "city", summary: "Cusco was the imperial capital of the Inca Empire.", latitude: -13.52, longitude: -71.98 },
      { key: "pachacuti", name: "Pachacuti", entityType: "person", summary: "Pachacuti transformed the Kingdom of Cusco into an expansive Inca empire.", latitude: -13.52, longitude: -71.98 },
      { key: "atahualpa", name: "Atahualpa", entityType: "person", summary: "Atahualpa was an Inca ruler captured by Francisco Pizarro during the Spanish conquest.", latitude: -7.16, longitude: -78.51 },
    ],
    events: [
      { key: "expansion", name: "Pachacuti's imperial expansion", eventType: "politics", description: "Pachacuti initiated major expansion and administrative transformation of Inca power.", startYear: 1438, latitude: -13.52, longitude: -71.98 },
      { key: "civil-war", name: "Inca Civil War", eventType: "war", description: "Atahualpa and Huascar fought for succession, weakening the empire before Spanish arrival.", startYear: 1529, endYear: 1532, latitude: -1.83, longitude: -78.18 },
      { key: "cajamarca", name: "Battle of Cajamarca", eventType: "battle", description: "Spanish forces captured Atahualpa in a surprise attack.", startYear: 1532, latitude: -7.16, longitude: -78.51 },
      { key: "cusco-fall", name: "Spanish capture of Cusco", eventType: "battle", description: "Spanish forces entered Cusco, taking the imperial capital.", startYear: 1533, latitude: -13.52, longitude: -71.98 },
      { key: "vilcabamba", name: "Fall of Vilcabamba", eventType: "battle", description: "The Spanish captured the last Neo-Inca stronghold.", startYear: 1572, latitude: -13.05, longitude: -73.13 },
    ],
    relationships: [["Cusco", "Inca Empire", "capital_of"], ["Pachacuti", "Inca Empire", "ruled"], ["Atahualpa", "Inca Empire", "ruled"]],
  },
  {
    slug: "renaissance",
    name: "Renaissance Europe",
    description: "Urban culture, humanism, printing, art, and political transformation in early modern Europe.",
    startYear: 1300,
    endYear: 1600,
    entities: [
      { key: "florence", name: "Florence", entityType: "city", summary: "Florence was a major Renaissance city known for banking, politics, art, and humanism.", latitude: 43.77, longitude: 11.26 },
      { key: "medici", name: "House of Medici", entityType: "dynasty", summary: "The Medici were a powerful Florentine banking and political family and patrons of Renaissance culture.", latitude: 43.77, longitude: 11.26 },
      { key: "leonardo", name: "Leonardo da Vinci", entityType: "person", summary: "Leonardo da Vinci was an artist, engineer, and observer associated with Renaissance creativity.", latitude: 43.77, longitude: 11.26 },
      { key: "gutenberg", name: "Johannes Gutenberg", entityType: "person", summary: "Johannes Gutenberg developed movable-type printing in Europe.", latitude: 49.99, longitude: 8.27 },
    ],
    events: [
      { key: "petrarch", name: "Petrarch crowned poet laureate", eventType: "cultural", description: "Petrarch's recognition in Rome became a symbolic marker for Renaissance humanism.", startYear: 1341, latitude: 41.9, longitude: 12.5 },
      { key: "printing", name: "Gutenberg Bible printed", eventType: "technology", description: "Movable-type printing accelerated the spread of books, texts, and ideas.", startYear: 1455, latitude: 49.99, longitude: 8.27 },
      { key: "constantinople", name: "Fall of Constantinople and Greek scholars in Italy", eventType: "cultural", description: "The Ottoman capture of Constantinople intensified Greek scholarly migration and manuscript circulation.", startYear: 1453, latitude: 41.01, longitude: 28.97 },
      { key: "sistine", name: "Michelangelo paints the Sistine Chapel ceiling", eventType: "cultural", description: "Michelangelo's ceiling became one of the most famous works of Renaissance art.", startYear: 1508, endYear: 1512, latitude: 41.9, longitude: 12.45 },
      { key: "scientific", name: "Publication of De revolutionibus", eventType: "cultural", description: "Copernicus's heliocentric work helped launch major changes in European astronomy.", startYear: 1543, latitude: 54.35, longitude: 18.65 },
    ],
    relationships: [["House of Medici", "Florence", "ruled"], ["Leonardo da Vinci", "Florence", "worked_in"], ["Johannes Gutenberg", "Renaissance Europe", "associated_with"]],
  },
  {
    slug: "ottoman-empire",
    name: "Ottoman Empire",
    description: "Ottoman expansion, imperial administration, and long-running Mediterranean and Eurasian power.",
    startYear: 1299,
    endYear: 1922,
    entities: [
      { key: "ottoman", name: "Ottoman Empire", entityType: "empire", summary: "The Ottoman Empire ruled territories across Anatolia, southeastern Europe, the Middle East, and North Africa.", latitude: 41.01, longitude: 28.97 },
      { key: "osman", name: "Osman I", entityType: "person", summary: "Osman I is traditionally regarded as the founder of the Ottoman dynasty.", latitude: 40.2, longitude: 29.06 },
      { key: "mehmed", name: "Mehmed II", entityType: "person", summary: "Mehmed II conquered Constantinople and transformed Ottoman imperial power.", latitude: 41.01, longitude: 28.97 },
      { key: "istanbul", name: "Istanbul", entityType: "city", summary: "Istanbul became the Ottoman capital after the conquest of Constantinople.", latitude: 41.01, longitude: 28.97 },
    ],
    events: [
      { key: "founding", name: "Founding of the Ottoman polity", eventType: "politics", description: "The Ottoman beylik emerged in northwestern Anatolia.", startYear: 1299, latitude: 40.2, longitude: 29.06 },
      { key: "constantinople", name: "Fall of Constantinople", eventType: "battle", description: "Mehmed II captured Constantinople, ending the Byzantine Empire.", startYear: 1453, latitude: 41.01, longitude: 28.97 },
      { key: "mohacs", name: "Battle of Mohacs", eventType: "battle", description: "Ottoman victory transformed the political map of Hungary and central Europe.", startYear: 1526, latitude: 45.99, longitude: 18.68 },
      { key: "vienna", name: "Siege of Vienna", eventType: "battle", description: "Ottoman forces besieged Vienna during imperial expansion into central Europe.", startYear: 1529, latitude: 48.21, longitude: 16.37 },
      { key: "abolition", name: "Abolition of the Ottoman Sultanate", eventType: "politics", description: "The Turkish nationalist government abolished the sultanate after World War I.", startYear: 1922, latitude: 39.93, longitude: 32.86 },
    ],
    relationships: [["Osman I", "Ottoman Empire", "founded"], ["Mehmed II", "Ottoman Empire", "ruled"], ["Istanbul", "Ottoman Empire", "capital_of"]],
  },
  {
    slug: "mughal-empire",
    name: "Mughal Empire",
    description: "Mughal imperial rule in South Asia from Babur through Aurangzeb and imperial decline.",
    startYear: 1526,
    endYear: 1857,
    entities: [
      { key: "mughal", name: "Mughal Empire", entityType: "empire", summary: "The Mughal Empire ruled much of South Asia and blended Persianate, Central Asian, and Indian political cultures.", latitude: 28.61, longitude: 77.21 },
      { key: "babur", name: "Babur", entityType: "person", summary: "Babur founded the Mughal Empire after victory at Panipat.", latitude: 29.39, longitude: 76.97 },
      { key: "akbar", name: "Akbar", entityType: "person", summary: "Akbar expanded and consolidated Mughal rule through military, administrative, and religious policy.", latitude: 27.18, longitude: 78.02 },
      { key: "delhi", name: "Delhi", entityType: "city", summary: "Delhi was an important imperial center in Mughal South Asia.", latitude: 28.61, longitude: 77.21 },
    ],
    events: [
      { key: "panipat", name: "First Battle of Panipat", eventType: "battle", description: "Babur defeated Ibrahim Lodi and founded Mughal power in northern India.", startYear: 1526, latitude: 29.39, longitude: 76.97 },
      { key: "akbar-reign", name: "Akbar's accession", eventType: "politics", description: "Akbar became Mughal emperor and later consolidated imperial institutions.", startYear: 1556, latitude: 28.61, longitude: 77.21 },
      { key: "fatehpur", name: "Construction of Fatehpur Sikri", eventType: "cultural", description: "Akbar built Fatehpur Sikri as a planned imperial capital.", startYear: 1571, latitude: 27.09, longitude: 77.66 },
      { key: "taj", name: "Construction of the Taj Mahal", eventType: "cultural", description: "Shah Jahan commissioned the Taj Mahal as a monumental mausoleum.", startYear: 1632, endYear: 1653, latitude: 27.18, longitude: 78.04 },
      { key: "rebellion", name: "Indian Rebellion of 1857", eventType: "revolt", description: "The rebellion ended the Mughal dynasty's remaining political authority.", startYear: 1857, latitude: 28.61, longitude: 77.21 },
    ],
    relationships: [["Babur", "Mughal Empire", "founded"], ["Akbar", "Mughal Empire", "ruled"], ["Delhi", "Mughal Empire", "capital_of"]],
  },
  {
    slug: "age-of-exploration",
    name: "Age of Exploration",
    description: "Oceanic exploration, empire, trade routes, and global encounters from the fifteenth to seventeenth centuries.",
    startYear: 1400,
    endYear: 1700,
    entities: [
      { key: "portugal", name: "Kingdom of Portugal", entityType: "kingdom", summary: "Portugal sponsored Atlantic and Indian Ocean voyages that reshaped global trade.", latitude: 38.72, longitude: -9.14 },
      { key: "spain", name: "Spanish Empire", entityType: "empire", summary: "Spain built a vast overseas empire in the Americas and across oceanic trade networks.", latitude: 40.42, longitude: -3.7 },
      { key: "columbus", name: "Christopher Columbus", entityType: "person", summary: "Christopher Columbus led Spanish-backed Atlantic voyages beginning in 1492.", latitude: 28.29, longitude: -16.63 },
      { key: "magellan", name: "Ferdinand Magellan", entityType: "person", summary: "Magellan led the expedition that achieved the first circumnavigation, completed after his death.", latitude: 38.72, longitude: -9.14 },
    ],
    events: [
      { key: "ceuta", name: "Conquest of Ceuta", eventType: "battle", description: "Portugal's capture of Ceuta marked an early step in overseas expansion.", startYear: 1415, latitude: 35.89, longitude: -5.32 },
      { key: "columbus", name: "First voyage of Christopher Columbus", eventType: "exploration", description: "Columbus's voyage connected the Atlantic worlds in enduring and disruptive ways.", startYear: 1492, latitude: 24.0, longitude: -74.5 },
      { key: "tordesillas", name: "Treaty of Tordesillas", eventType: "treaty", description: "Spain and Portugal divided claims to overseas expansion under papal mediation.", startYear: 1494, latitude: 41.5, longitude: -5.0 },
      { key: "gama", name: "Vasco da Gama reaches India", eventType: "exploration", description: "Portuguese ships linked Europe and India by sea around Africa.", startYear: 1498, latitude: 11.26, longitude: 75.78 },
      { key: "circumnavigation", name: "Magellan-Elcano circumnavigation", eventType: "exploration", description: "The expedition completed the first circumnavigation of the globe.", startYear: 1519, endYear: 1522, latitude: 37.39, longitude: -5.99 },
    ],
    relationships: [["Christopher Columbus", "Spanish Empire", "served"], ["Ferdinand Magellan", "Kingdom of Portugal", "born_in"], ["Kingdom of Portugal", "Age of Exploration", "part_of"]],
  },
  {
    slug: "american-revolution",
    name: "American Revolution",
    description: "The imperial crisis, war for independence, and founding of the United States.",
    startYear: 1763,
    endYear: 1789,
    entities: [
      { key: "us", name: "United States", entityType: "state", summary: "The United States emerged from British North American colonies during the American Revolution.", latitude: 38.9, longitude: -77.04 },
      { key: "britain", name: "Kingdom of Great Britain", entityType: "kingdom", summary: "Great Britain fought to retain authority over its North American colonies.", latitude: 51.51, longitude: -0.13 },
      { key: "washington", name: "George Washington", entityType: "person", summary: "George Washington commanded the Continental Army and became the first U.S. president.", latitude: 38.9, longitude: -77.04 },
      { key: "france", name: "Kingdom of France", entityType: "kingdom", summary: "France allied with the American revolutionaries against Great Britain.", latitude: 48.86, longitude: 2.35 },
    ],
    events: [
      { key: "stamp", name: "Stamp Act crisis", eventType: "politics", description: "Colonial resistance to parliamentary taxation intensified imperial conflict.", startYear: 1765, latitude: 42.36, longitude: -71.06 },
      { key: "lexington", name: "Battles of Lexington and Concord", eventType: "battle", description: "Armed conflict began between colonial militia and British regulars.", startYear: 1775, latitude: 42.45, longitude: -71.23 },
      { key: "declaration", name: "United States Declaration of Independence", eventType: "politics", description: "The Continental Congress declared independence from Great Britain.", startYear: 1776, latitude: 39.95, longitude: -75.16 },
      { key: "saratoga", name: "Battles of Saratoga", eventType: "battle", description: "American victory helped bring France openly into the war.", startYear: 1777, latitude: 43.0, longitude: -73.64 },
      { key: "yorktown", name: "Siege of Yorktown", eventType: "battle", description: "American and French forces trapped Cornwallis, effectively ending major combat.", startYear: 1781, latitude: 37.24, longitude: -76.51 },
    ],
    relationships: [["George Washington", "United States", "led"], ["Kingdom of France", "United States", "allied_with"], ["Kingdom of Great Britain", "United States", "fought"]],
  },
  {
    slug: "french-revolution",
    name: "French Revolution",
    description: "Revolutionary politics, social conflict, war, and state transformation in France.",
    startYear: 1789,
    endYear: 1799,
    entities: [
      { key: "france", name: "France", entityType: "state", summary: "France underwent radical political and social transformation during the Revolution.", latitude: 48.86, longitude: 2.35 },
      { key: "louis", name: "Louis XVI", entityType: "person", summary: "Louis XVI was the French king overthrown and executed during the Revolution.", latitude: 48.8, longitude: 2.12 },
      { key: "robespierre", name: "Maximilien Robespierre", entityType: "person", summary: "Robespierre was a Jacobin leader associated with the Committee of Public Safety and the Terror.", latitude: 48.86, longitude: 2.35 },
      { key: "paris", name: "Paris", entityType: "city", summary: "Paris was the political center of revolutionary mobilization and conflict.", latitude: 48.86, longitude: 2.35 },
    ],
    events: [
      { key: "estates", name: "Estates General of 1789", eventType: "politics", description: "The Estates General convened amid fiscal crisis and became a revolutionary assembly.", startYear: 1789, latitude: 48.8, longitude: 2.12 },
      { key: "bastille", name: "Storming of the Bastille", eventType: "revolt", description: "Parisian crowds seized the Bastille, symbolizing the collapse of royal authority.", startYear: 1789, latitude: 48.85, longitude: 2.37 },
      { key: "republic", name: "Abolition of the French monarchy", eventType: "politics", description: "The National Convention abolished monarchy and proclaimed a republic.", startYear: 1792, latitude: 48.86, longitude: 2.35 },
      { key: "terror", name: "Reign of Terror", eventType: "crisis", description: "Revolutionary government used emergency measures and executions against perceived enemies.", startYear: 1793, endYear: 1794, latitude: 48.86, longitude: 2.35 },
      { key: "brumaire", name: "Coup of 18 Brumaire", eventType: "politics", description: "Napoleon seized power and ended the Directory.", startYear: 1799, latitude: 48.86, longitude: 2.35 },
    ],
    relationships: [["Louis XVI", "France", "ruled"], ["Maximilien Robespierre", "France", "led"], ["Paris", "France", "capital_of"]],
  },
  {
    slug: "napoleonic",
    name: "Napoleonic Era",
    description: "Napoleon's rise, French imperial expansion, continental war, and postwar settlement.",
    startYear: 1799,
    endYear: 1815,
    entities: [
      { key: "napoleon", name: "Napoleon", entityType: "person", summary: "Napoleon Bonaparte rose from revolutionary general to emperor and reshaped Europe through war and administration.", latitude: 48.86, longitude: 2.35 },
      { key: "france", name: "First French Empire", entityType: "empire", summary: "The First French Empire was Napoleon's imperial state and military power base.", latitude: 48.86, longitude: 2.35 },
      { key: "britain", name: "United Kingdom", entityType: "state", summary: "The United Kingdom was a central opponent of Napoleonic France.", latitude: 51.51, longitude: -0.13 },
      { key: "russia", name: "Russian Empire", entityType: "empire", summary: "The Russian Empire became decisive in Napoleon's defeat after the 1812 invasion.", latitude: 55.75, longitude: 37.62 },
    ],
    events: [
      { key: "consulate", name: "Napoleon becomes First Consul", eventType: "politics", description: "Napoleon consolidated power after the Coup of 18 Brumaire.", startYear: 1799, latitude: 48.86, longitude: 2.35 },
      { key: "austerlitz", name: "Battle of Austerlitz", eventType: "battle", description: "Napoleon defeated Austrian and Russian forces in a major victory.", startYear: 1805, latitude: 49.13, longitude: 16.76 },
      { key: "trafalgar", name: "Battle of Trafalgar", eventType: "battle", description: "The British navy defeated the Franco-Spanish fleet, securing British naval dominance.", startYear: 1805, latitude: 36.18, longitude: -6.03 },
      { key: "russia", name: "French invasion of Russia", eventType: "invasion", description: "Napoleon's invasion of Russia ended in catastrophic retreat.", startYear: 1812, latitude: 55.75, longitude: 37.62 },
      { key: "waterloo", name: "Battle of Waterloo", eventType: "battle", description: "Coalition forces defeated Napoleon, ending his rule.", startYear: 1815, latitude: 50.68, longitude: 4.41 },
    ],
    relationships: [["Napoleon", "First French Empire", "ruled"], ["First French Empire", "United Kingdom", "fought"], ["First French Empire", "Russian Empire", "invaded"]],
  },
  {
    slug: "industrial-revolution",
    name: "Industrial Revolution",
    description: "Mechanization, steam power, factories, transport, and social transformation.",
    startYear: 1760,
    endYear: 1914,
    entities: [
      { key: "britain", name: "Great Britain", entityType: "state", summary: "Great Britain was an early center of industrialization through coal, textiles, iron, and finance.", latitude: 53.48, longitude: -2.24 },
      { key: "manchester", name: "Manchester", entityType: "city", summary: "Manchester became a major textile and factory city.", latitude: 53.48, longitude: -2.24 },
      { key: "watt", name: "James Watt", entityType: "person", summary: "James Watt improved steam engine technology central to industrial power.", latitude: 55.86, longitude: -4.25 },
      { key: "stephenson", name: "George Stephenson", entityType: "person", summary: "George Stephenson was influential in early railway engineering.", latitude: 54.98, longitude: -1.61 },
    ],
    events: [
      { key: "spinning-jenny", name: "Invention of the spinning jenny", eventType: "technology", description: "Textile mechanization increased yarn production and changed labor organization.", startYear: 1764, latitude: 53.76, longitude: -2.7 },
      { key: "watt-engine", name: "Watt steam engine patent", eventType: "technology", description: "Watt's improvements made steam power more efficient and commercially useful.", startYear: 1769, latitude: 52.49, longitude: -1.89 },
      { key: "iron-bridge", name: "Opening of the Iron Bridge", eventType: "technology", description: "The Iron Bridge demonstrated new possibilities for industrial iron construction.", startYear: 1781, latitude: 52.63, longitude: -2.49 },
      { key: "railway", name: "Stockton and Darlington Railway", eventType: "technology", description: "The railway helped launch modern steam railway transport.", startYear: 1825, latitude: 54.52, longitude: -1.55 },
      { key: "factory-acts", name: "Factory Acts", eventType: "reform", description: "Factory legislation responded to labor conditions in industrial Britain.", startYear: 1833, latitude: 51.51, longitude: -0.13 },
    ],
    relationships: [["Manchester", "Great Britain", "part_of"], ["James Watt", "Industrial Revolution", "associated_with"], ["George Stephenson", "Industrial Revolution", "associated_with"]],
  },
  {
    slug: "us-civil-war",
    name: "American Civil War",
    description: "Secession, slavery, Union war aims, Confederate defeat, and emancipation.",
    startYear: 1861,
    endYear: 1865,
    entities: [
      { key: "union", name: "Union", entityType: "state", summary: "The Union represented the United States government and loyal states during the Civil War.", latitude: 38.9, longitude: -77.04 },
      { key: "confederacy", name: "Confederate States of America", entityType: "state", summary: "The Confederacy was formed by seceding slaveholding states and defeated in 1865.", latitude: 37.54, longitude: -77.43 },
      { key: "lincoln", name: "Abraham Lincoln", entityType: "person", summary: "Abraham Lincoln led the United States through the Civil War and issued the Emancipation Proclamation.", latitude: 38.9, longitude: -77.04 },
      { key: "lee", name: "Robert E. Lee", entityType: "person", summary: "Robert E. Lee commanded the Army of Northern Virginia for the Confederacy.", latitude: 37.54, longitude: -77.43 },
    ],
    events: [
      { key: "sumter", name: "Battle of Fort Sumter", eventType: "battle", description: "Confederate forces fired on Fort Sumter, beginning the Civil War.", startYear: 1861, latitude: 32.75, longitude: -79.87 },
      { key: "antietam", name: "Battle of Antietam", eventType: "battle", description: "A bloody Union strategic victory preceded the Emancipation Proclamation.", startYear: 1862, latitude: 39.47, longitude: -77.74 },
      { key: "emancipation", name: "Emancipation Proclamation", eventType: "politics", description: "Lincoln declared enslaved people in rebelling areas to be free.", startYear: 1863, latitude: 38.9, longitude: -77.04 },
      { key: "gettysburg", name: "Battle of Gettysburg", eventType: "battle", description: "Union victory halted Lee's invasion of Pennsylvania.", startYear: 1863, latitude: 39.83, longitude: -77.23 },
      { key: "appomattox", name: "Appomattox Court House surrender", eventType: "politics", description: "Lee surrendered to Grant, signaling Confederate defeat.", startYear: 1865, latitude: 37.38, longitude: -78.8 },
    ],
    relationships: [["Abraham Lincoln", "Union", "led"], ["Robert E. Lee", "Confederate States of America", "commanded"], ["Union", "Confederate States of America", "fought"]],
  },
  {
    slug: "world-war-ii",
    name: "World War II",
    description: "Global war from Axis expansion to Allied victory and postwar settlement.",
    startYear: 1939,
    endYear: 1945,
    entities: [
      { key: "allies", name: "Allies of World War II", entityType: "alliance", summary: "The Allies were the coalition that fought and defeated the Axis powers.", latitude: 51.51, longitude: -0.13 },
      { key: "axis", name: "Axis powers", entityType: "alliance", summary: "The Axis powers were led by Germany, Italy, and Japan during World War II.", latitude: 52.52, longitude: 13.4 },
      { key: "churchill", name: "Winston Churchill", entityType: "person", summary: "Winston Churchill led Britain through much of World War II.", latitude: 51.51, longitude: -0.13 },
      { key: "hitler", name: "Adolf Hitler", entityType: "person", summary: "Adolf Hitler led Nazi Germany and initiated aggressive war and genocide.", latitude: 52.52, longitude: 13.4 },
    ],
    events: [
      { key: "poland", name: "Invasion of Poland", eventType: "invasion", description: "Germany's invasion of Poland triggered declarations of war by Britain and France.", startYear: 1939, latitude: 52.23, longitude: 21.01 },
      { key: "france", name: "Battle of France", eventType: "battle", description: "German forces defeated France and the Low Countries in a rapid campaign.", startYear: 1940, latitude: 48.86, longitude: 2.35 },
      { key: "barbarossa", name: "Operation Barbarossa", eventType: "invasion", description: "Germany invaded the Soviet Union, opening the Eastern Front.", startYear: 1941, latitude: 55.75, longitude: 37.62 },
      { key: "pearl", name: "Attack on Pearl Harbor", eventType: "battle", description: "Japan attacked the U.S. Pacific Fleet, bringing the United States into the war.", startYear: 1941, latitude: 21.36, longitude: -157.95 },
      { key: "dday", name: "Normandy landings", eventType: "battle", description: "Allied forces landed in Normandy to open a western front in Europe.", startYear: 1944, latitude: 49.34, longitude: -0.61 },
    ],
    relationships: [["Winston Churchill", "Allies of World War II", "led"], ["Adolf Hitler", "Axis powers", "led"], ["Allies of World War II", "Axis powers", "fought"]],
  },
  {
    slug: "cold-war",
    name: "Cold War",
    description: "Global ideological, military, diplomatic, and technological rivalry after World War II.",
    startYear: 1947,
    endYear: 1991,
    entities: [
      { key: "us", name: "United States", entityType: "state", summary: "The United States led the western bloc during the Cold War.", latitude: 38.9, longitude: -77.04 },
      { key: "ussr", name: "Soviet Union", entityType: "state", summary: "The Soviet Union led the eastern bloc and rivaled the United States globally.", latitude: 55.75, longitude: 37.62 },
      { key: "nato", name: "NATO", entityType: "alliance", summary: "NATO was a western military alliance formed during the early Cold War.", latitude: 50.85, longitude: 4.35 },
      { key: "warsaw", name: "Warsaw Pact", entityType: "alliance", summary: "The Warsaw Pact was a Soviet-led military alliance in eastern Europe.", latitude: 52.23, longitude: 21.01 },
    ],
    events: [
      { key: "truman", name: "Truman Doctrine", eventType: "politics", description: "The United States committed to containing communist expansion.", startYear: 1947, latitude: 38.9, longitude: -77.04 },
      { key: "berlin-airlift", name: "Berlin Airlift", eventType: "crisis", description: "Western powers supplied West Berlin during the Soviet blockade.", startYear: 1948, endYear: 1949, latitude: 52.52, longitude: 13.4 },
      { key: "cuban", name: "Cuban Missile Crisis", eventType: "crisis", description: "The United States and Soviet Union confronted each other over missiles in Cuba.", startYear: 1962, latitude: 23.11, longitude: -82.37 },
      { key: "detente", name: "SALT I", eventType: "treaty", description: "The superpowers signed arms control agreements during detente.", startYear: 1972, latitude: 55.75, longitude: 37.62 },
      { key: "berlin-wall", name: "Fall of the Berlin Wall", eventType: "politics", description: "The opening of the Berlin Wall symbolized the collapse of eastern bloc control.", startYear: 1989, latitude: 52.52, longitude: 13.4 },
    ],
    relationships: [["United States", "NATO", "member_of"], ["Soviet Union", "Warsaw Pact", "led"], ["NATO", "Warsaw Pact", "rival_of"]],
  },
];

export const broadHistoricalScenarioSlugs = scenarioPacks.map((scenario) => scenario.slug);

export const broadHistoricalScenarios = Object.fromEntries(
  scenarioPacks.map((scenario) => [
    scenario.slug,
    {
      slug: scenario.slug,
      name: scenario.name,
      load: (client: PoolClient) => loadLocalScenario(client, scenario),
    },
  ])
);
