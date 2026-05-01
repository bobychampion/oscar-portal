-- Phase 1: RBAC — Role-Based Access Control

CREATE TYPE user_role AS ENUM ('admin','finance','front_desk','lab_scientist','doctor');

CREATE TABLE user_profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'front_desk',
  full_name   text        NOT NULL,
  phone       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Stable helper called in every RLS policy (one lookup per transaction)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin full access user_profiles"
  ON user_profiles FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Replace blanket 'authenticated' policies with role-specific ones
DROP POLICY IF EXISTS "Admin full access applications"        ON applications;
DROP POLICY IF EXISTS "Admin full access application_tests"  ON application_tests;
DROP POLICY IF EXISTS "Admin full access test_results"       ON test_results;
DROP POLICY IF EXISTS "Admin full access api_keys"           ON api_keys;
DROP POLICY IF EXISTS "Admin full access webhook_endpoints"  ON webhook_endpoints;
DROP POLICY IF EXISTS "Admin full access webhook_deliveries" ON webhook_deliveries;

-- applications: front_desk + admin write; all roles read
CREATE POLICY "Role access applications"
  ON applications FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor'))
  WITH CHECK (get_my_role() IN ('admin','front_desk'));

-- application_tests: same as applications
CREATE POLICY "Role access application_tests"
  ON application_tests FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor'))
  WITH CHECK (get_my_role() IN ('admin','front_desk'));

-- test_results: lab_scientist + admin write; all roles read
CREATE POLICY "Role access test_results"
  ON test_results FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor'))
  WITH CHECK (get_my_role() IN ('admin','lab_scientist'));

-- admin-only tables
CREATE POLICY "Admin only api_keys"
  ON api_keys FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admin only webhook_endpoints"
  ON webhook_endpoints FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Admin only webhook_deliveries"
  ON webhook_deliveries FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
