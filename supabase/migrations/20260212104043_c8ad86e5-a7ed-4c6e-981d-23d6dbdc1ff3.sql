
-- Add DELETE policies for leads (currently only ALL policies exist for broker/super_admin which already cover DELETE)
-- No migration needed since the ALL policies already cover DELETE operations
-- But we need to verify: the existing permissive ALL policies for super_admin and broker already include DELETE
-- So no schema change is required
SELECT 1;
