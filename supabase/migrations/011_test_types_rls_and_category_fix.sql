-- 011_test_types_rls_and_category_fix.sql
-- Fixes a severe gap: test_types has RLS enabled (002) but no write policy was
-- ever added for it (unlike test_categories/test_parameters in 008). The admin
-- UI writes through the anon-key browser client, so every create/edit/delete of
-- a test type has been silently denied by Postgres RLS. The same gap hides
-- inactive test types from the admin's own list (is_active = true was baked
-- into the only read policy). Also backfills any orphaned category_id and
-- enforces it NOT NULL going forward.

-- VERIFICATION NOTE: this migration was authored without direct production DB
-- access (blocked by harness production-safety policy). The backfill steps
-- below are written defensively to handle zero-or-more orphan rows. Before
-- running this against production, review row counts via the Supabase
-- dashboard:
--   select count(*) from test_types where category_id is null;
-- Alternatively, run `supabase db push` and treat any NOT NULL constraint
-- violation on the final step as a signal that an unhandled orphan slipped
-- through the backfill — if so, inspect the offending rows before retrying.

-- ── RLS: test_types — public active-only read, staff full read, admin write ──
-- NOTE: "Admin manage test_types" was found to already exist on the linked
-- production database under this exact name/definition (applied manually,
-- outside migration history, at some point after migration 010). All
-- CREATE POLICY statements below are preceded by DROP POLICY IF EXISTS so
-- this migration is idempotent regardless of what's already been applied.
DROP POLICY IF EXISTS "Public read test_types" ON test_types;
DROP POLICY IF EXISTS "Public read active test_types" ON test_types;
DROP POLICY IF EXISTS "Staff read all test_types" ON test_types;
DROP POLICY IF EXISTS "Admin manage test_types" ON test_types;

CREATE POLICY "Public read active test_types"
  ON test_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff read all test_types"
  ON test_types FOR SELECT
  USING (get_my_role() IS NOT NULL);

CREATE POLICY "Admin manage test_types"
  ON test_types FOR ALL
  USING  (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── Category backfill safety net (defensive — handles zero-or-more orphans) ──
INSERT INTO test_categories (name, report_layout)
SELECT DISTINCT category, 'structured_table'
FROM test_types
WHERE category_id IS NULL AND category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE test_types t
SET category_id = c.id
FROM test_categories c
WHERE t.category_id IS NULL
  AND t.category IS NOT NULL
  AND lower(trim(t.category)) = lower(trim(c.name));

-- Any test_type with category_id still NULL has no free-text category at all
-- (category IS NULL or blank) — bucket these into a catch-all category rather
-- than leaving them NULL, since the NOT NULL constraint below requires it.
INSERT INTO test_categories (name, report_layout, color)
VALUES ('Uncategorized', 'structured_table', '#6b7280')
ON CONFLICT (name) DO NOTHING;

UPDATE test_types t
SET category_id = c.id
FROM test_categories c
WHERE t.category_id IS NULL AND c.name = 'Uncategorized';

-- ── Enforce category_id going forward ─────────────────────────────────────────
-- Safe: TestTypeManagement.tsx (the only insert/update path for test_types)
-- already requires category_id client-side before saving.
ALTER TABLE test_types ALTER COLUMN category_id SET NOT NULL;
