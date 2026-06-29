ALTER TABLE entities
ADD COLUMN IF NOT EXISTS wikipedia_url TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_description TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_summary TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_last_updated TIMESTAMP;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS wikipedia_url TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_description TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_summary TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_last_updated TIMESTAMP;
