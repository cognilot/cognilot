-- Migration: aliases.value -> aliases.memory_key
-- Aliases are now named references to memory fields, not standalone values.
-- Before: { label: "correo", value: "jack@gmail.com" }
-- After:  { label: "correo", memoryKey: "email" }  (points to data_learned.email)

-- 1. Add memory_key column (nullable for migration)
ALTER TABLE "aliases" ADD COLUMN "memory_key" text;

-- 2. Migrate existing data: map common value patterns to memory keys
--    If value matches email pattern, map to "email"
--    If value matches phone pattern, map to "phone_number"
--    Otherwise, keep label as-is (fallback: label -> memoryKey)
UPDATE "aliases" SET "memory_key" = CASE
  WHEN "value" ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN 'email'
  WHEN "value" ~* '^\+?[0-9\s\-\(\)]{7,15}$' THEN 'phone_number'
  ELSE 'full_name'
END;

-- 3. Make memory_key NOT NULL
ALTER TABLE "aliases" ALTER COLUMN "memory_key" SET NOT NULL;

-- 4. Drop the old value column
ALTER TABLE "aliases" DROP COLUMN "value";
