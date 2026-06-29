CREATE UNIQUE INDEX IF NOT EXISTS sources_unique_type_url
ON sources (source_type, source_url);
