-- Migration: 0002_drop_aliases_and_rename_memories.sql
-- Eliminates aliases table and refactors user_profiles to memories (column: data)

DROP TABLE IF EXISTS "aliases";

ALTER TABLE IF EXISTS "user_profiles" RENAME TO "memories";

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memories' AND column_name = 'data_learned'
  ) THEN
    ALTER TABLE "memories" RENAME COLUMN "data_learned" TO "data";
  END IF;
END $$;
