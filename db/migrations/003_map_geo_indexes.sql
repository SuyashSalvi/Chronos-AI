CREATE INDEX IF NOT EXISTS events_geo_scenario_year_idx
ON events (scenario_id, start_year, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS entities_geo_scenario_year_idx
ON entities (scenario_id, start_year, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_geo_type_year_idx
ON events (event_type, start_year, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS entities_geo_type_year_idx
ON entities (entity_type, start_year, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
