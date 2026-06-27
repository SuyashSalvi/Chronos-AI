CREATE INDEX IF NOT EXISTS events_timeline_scenario_year_idx
ON events (scenario_id, start_year, event_type, event_id);

CREATE INDEX IF NOT EXISTS events_timeline_year_idx
ON events (start_year, event_id);

CREATE INDEX IF NOT EXISTS event_entities_event_idx
ON event_entities (event_id);

CREATE INDEX IF NOT EXISTS event_entities_entity_idx
ON event_entities (entity_id);
