CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS scenarios (
  scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_year INT,
  end_year INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entities (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(scenario_id),
  wikidata_id TEXT UNIQUE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  summary TEXT,
  start_year INT,
  end_year INT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  metadata_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(scenario_id),
  wikidata_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_year INT,
  end_year INT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source_url TEXT,
  source_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relationships (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(scenario_id),
  source_entity_id UUID REFERENCES entities(entity_id),
  target_entity_id UUID REFERENCES entities(entity_id),
  relationship_type TEXT NOT NULL,
  start_year INT,
  end_year INT,
  confidence_score NUMERIC DEFAULT 1.0,
  source_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_entities (
  event_id UUID REFERENCES events(event_id),
  entity_id UUID REFERENCES entities(entity_id),
  role TEXT,
  PRIMARY KEY (event_id, entity_id, role)
);

CREATE TABLE IF NOT EXISTS sources (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  retrieved_at TIMESTAMP DEFAULT NOW(),
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS entity_sources (
  entity_id UUID REFERENCES entities(entity_id),
  source_id UUID REFERENCES sources(source_id),
  PRIMARY KEY (entity_id, source_id)
);

CREATE TABLE IF NOT EXISTS event_sources (
  event_id UUID REFERENCES events(event_id),
  source_id UUID REFERENCES sources(source_id),
  PRIMARY KEY (event_id, source_id)
);

CREATE TABLE IF NOT EXISTS alternate_timelines (
  timeline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(scenario_id),
  user_prompt TEXT NOT NULL,
  changed_event_id UUID REFERENCES events(event_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alternate_events (
  alt_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES alternate_timelines(timeline_id),
  year INT,
  name TEXT NOT NULL,
  description TEXT,
  causal_parent_event_id UUID,
  confidence_score NUMERIC DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);
