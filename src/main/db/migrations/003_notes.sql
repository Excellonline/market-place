ALTER TABLE ads ADD COLUMN notes TEXT;
INSERT INTO schema_version (version) VALUES (3);
