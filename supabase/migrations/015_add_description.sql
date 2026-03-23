-- 015_add_description.sql
-- Add description column to skills table for AI trigger matching

ALTER TABLE skills ADD COLUMN IF NOT EXISTS description text;

-- Add comment explaining the field
COMMENT ON COLUMN skills.description IS 'AI trigger description - tells Claude/Cursor when to use this skill';
