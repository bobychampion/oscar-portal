-- 009_result_engine_ui.sql
-- Additive support for the Test Management & Dynamic Result Template UI.
-- No new tables, roles, or audit trail — see plan: one table per concern.

-- ── Category backfill safety net ─────────────────────────────────────────────
-- 008 backfilled category_id by matching free-text `category` to a seeded
-- test_categories.name. Any test_type whose free-text category didn't match
-- a seeded name (e.g. a custom category added after 008 ran) is still
-- category_id IS NULL. The new admin UI groups by category_id, so nothing
-- should be left orphaned.
INSERT INTO test_categories (name, report_layout)
SELECT DISTINCT category, 'structured_table'
FROM test_types
WHERE category_id IS NULL AND category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

UPDATE test_types t
SET category_id = c.id
FROM test_categories c
WHERE t.category_id IS NULL
  AND t.category IS NOT NULL
  AND lower(trim(t.category)) = lower(trim(c.name));

-- ── Storage bucket for `upload` result mode ──────────────────────────────────
-- Private bucket — files are reachable only via signed URLs minted server-side
-- (by the service-role edge functions), never via a public URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-results', 'lab-results', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff read lab-results"  ON storage.objects;
DROP POLICY IF EXISTS "Staff write lab-results" ON storage.objects;

CREATE POLICY "Staff read lab-results"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lab-results'
    AND get_my_role() IN ('admin','front_desk','lab_scientist','doctor','pathologist')
  );

CREATE POLICY "Staff write lab-results"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lab-results'
    AND get_my_role() IN ('admin','lab_scientist')
  );
