-- Per-ad snooze: hide from aging counts + block automated actions until this timestamp.
ALTER TABLE ads ADD COLUMN snoozed_until INTEGER;

-- Per-platform pause: scheduler skips this platform until this timestamp.
-- Stored as settings rows: paused_until.<platform> = unix ms or null.
-- (No new column needed; using the existing settings KV.)

INSERT INTO schema_version (version) VALUES (2);
