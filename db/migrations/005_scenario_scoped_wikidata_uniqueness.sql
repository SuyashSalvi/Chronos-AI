ALTER TABLE entities
DROP CONSTRAINT IF EXISTS entities_wikidata_id_key;

ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_wikidata_id_key;

DROP INDEX IF EXISTS entities_scenario_wikidata_unique;

DROP INDEX IF EXISTS events_scenario_wikidata_unique;

CREATE UNIQUE INDEX IF NOT EXISTS entities_scenario_wikidata_unique
ON entities (scenario_id, wikidata_id);

CREATE UNIQUE INDEX IF NOT EXISTS events_scenario_wikidata_unique
ON events (scenario_id, wikidata_id);
