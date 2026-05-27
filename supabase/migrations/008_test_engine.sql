-- 008_test_engine.sql
-- Upgrade to dynamic configurable test engine
-- Phase 1: schema foundation

-- ── New role ─────────────────────────────────────────────────────────────────
-- Must run outside transaction block in older Postgres; Supabase (PG15) allows it
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pathologist';

-- ── test_categories ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_categories (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL UNIQUE,
  description   text,
  report_layout text        NOT NULL DEFAULT 'structured_table',
  -- structured_table | compact | matrix | narrative | upload_viewer
  color         text        NOT NULL DEFAULT '#0ca694',
  icon          text,
  is_active     boolean     NOT NULL DEFAULT true,
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO test_categories (name, description, report_layout, color, display_order) VALUES
  ('Haematology',          'Blood cell analysis and coagulation studies',   'structured_table', '#dc2626', 1),
  ('Serology',             'Antibody and antigen detection',                'compact',          '#7c3aed', 2),
  ('Clinical Chemistry',   'Biochemical analysis of blood and body fluids', 'structured_table', '#0ca694', 3),
  ('Microbiology',         'Culture, sensitivity and microscopy',           'narrative',        '#16a34a', 4),
  ('Toxicology',           'Drug screening and toxin analysis',             'matrix',           '#d97706', 5),
  ('Radiology',            'Imaging reports — X-ray, MRI, Ultrasound',     'upload_viewer',    '#0ea5e9', 6),
  ('Histopathology',       'Tissue biopsy and cytology',                   'narrative',        '#9333ea', 7),
  ('Molecular Diagnostics','PCR, DNA and genetic testing',                 'compact',          '#be123c', 8)
ON CONFLICT (name) DO NOTHING;

-- ── Enhance test_types ────────────────────────────────────────────────────────
ALTER TABLE test_types
  ADD COLUMN IF NOT EXISTS category_id      uuid        REFERENCES test_categories(id),
  ADD COLUMN IF NOT EXISTS code             text,
  ADD COLUMN IF NOT EXISTS result_mode      text        NOT NULL DEFAULT 'numeric',
  -- result_mode: numeric | positive_negative | reactive | panel | observation | grid | upload
  ADD COLUMN IF NOT EXISTS specimen_type    text,
  ADD COLUMN IF NOT EXISTS turnaround_hours int         NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS report_template  text,
  ADD COLUMN IF NOT EXISTS instructions     text,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_types_code
  ON test_types(code) WHERE code IS NOT NULL;

-- Migrate existing free-text category → FK
UPDATE test_types t
SET category_id = c.id
FROM test_categories c
WHERE lower(trim(t.category)) = lower(trim(c.name));

-- Auto-detect result modes from existing test names
UPDATE test_types SET result_mode = 'panel'
WHERE lower(name) LIKE ANY(ARRAY[
  '%blood count%','%full blood%','%lipid profile%','%liver function%',
  '%renal function%','%thyroid%','%electrolytes%','%coagulation%',
  '%urinalysis%','%urine routine%','%metabolic%'
]);

UPDATE test_types SET result_mode = 'reactive'
WHERE lower(name) LIKE ANY(ARRAY[
  '%hiv%','%hepatitis%','%hbsag%','%hcv%','%vdrl%',
  '%syphilis%','%widal%','%rheumatoid%','%aso%'
]);

UPDATE test_types SET result_mode = 'positive_negative'
WHERE lower(name) LIKE ANY(ARRAY[
  '%pregnancy%','%malaria%','%typhoid%','%dengue%','%covid%','%strep%'
]);

UPDATE test_types SET result_mode = 'upload'
WHERE lower(name) LIKE ANY(ARRAY[
  '%x-ray%','%xray%','%mri%','%ultrasound%','%ct scan%',
  '%pet scan%','%echocardiograph%','%echo%'
]);

UPDATE test_types SET result_mode = 'observation'
WHERE lower(name) LIKE ANY(ARRAY[
  '%microscopy%','%histology%','%biopsy%','%cytology%','%culture%',
  '%sensitivity%','%smear%','%gram stain%'
]);

-- ── test_parameters ───────────────────────────────────────────────────────────
-- Sub-parameters for panel, grid, and structured tests
CREATE TABLE IF NOT EXISTS test_parameters (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type_id     uuid        NOT NULL REFERENCES test_types(id) ON DELETE CASCADE,
  parameter_name   text        NOT NULL,
  unit             text,
  reference_range  text,        -- human-readable e.g. "13.0 – 16.0"
  male_min         numeric,
  male_max         numeric,
  female_min       numeric,
  female_max       numeric,
  age_min_years    int,         -- null = no lower age bound
  age_max_years    int,         -- null = no upper age bound
  critical_min     numeric,
  critical_max     numeric,
  display_order    int         NOT NULL DEFAULT 0,
  parameter_type   text        NOT NULL DEFAULT 'numeric',
  -- parameter_type: numeric | text | calculated
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Enhance order_results ─────────────────────────────────────────────────────
ALTER TABLE order_results
  ADD COLUMN IF NOT EXISTS result_mode  text,
  ADD COLUMN IF NOT EXISTS result_data  jsonb,
  -- for panel: {"parameters":[{"parameter_id":"...","value":"14.5","interpretation":"normal"},...]}
  -- for grid:  {"rows":[{"substance":"Cannabis","result":"Negative","cutoff":"50 ng/mL"},...]}
  ADD COLUMN IF NOT EXISTS file_url     text,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'submitted',
  -- status: draft | submitted | verified
  ADD COLUMN IF NOT EXISTS verified_by  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at  timestamptz;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_categories_order ON test_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_test_types_category   ON test_types(category_id);
CREATE INDEX IF NOT EXISTS idx_test_params_test      ON test_parameters(test_type_id, display_order);
CREATE INDEX IF NOT EXISTS idx_order_results_status  ON order_results(status);

-- ── RLS: test_categories (public read, admin write) ───────────────────────────
ALTER TABLE test_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read test_categories"  ON test_categories;
DROP POLICY IF EXISTS "Admin manage test_categories" ON test_categories;

CREATE POLICY "Public read test_categories"
  ON test_categories FOR SELECT USING (true);

CREATE POLICY "Admin manage test_categories"
  ON test_categories FOR ALL
  USING  (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── RLS: test_parameters (all staff read, admin write) ────────────────────────
ALTER TABLE test_parameters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read test_parameters"    ON test_parameters;
DROP POLICY IF EXISTS "Admin manage test_parameters" ON test_parameters;

CREATE POLICY "Auth read test_parameters"
  ON test_parameters FOR SELECT
  USING (get_my_role() IS NOT NULL);

CREATE POLICY "Admin manage test_parameters"
  ON test_parameters FOR ALL
  USING  (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── RLS: extend order_results to include pathologist ─────────────────────────
DROP POLICY IF EXISTS "Role access order_results" ON order_results;

CREATE POLICY "Role access order_results" ON order_results FOR ALL
  USING (
    get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor','pathologist')
  )
  WITH CHECK (
    get_my_role() IN ('admin','front_desk','lab_scientist','doctor','pathologist')
  );
