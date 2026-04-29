-- Row-Level Security Policies

ALTER TABLE test_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Public read: test types and pickup locations (active only)
CREATE POLICY "Public read test_types"
  ON test_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read pickup_locations"
  ON pickup_locations FOR SELECT
  USING (is_active = true);

-- Admin full access (authenticated users only)
CREATE POLICY "Admin full access applications"
  ON applications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access application_tests"
  ON application_tests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access test_results"
  ON test_results FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access api_keys"
  ON api_keys FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access webhook_endpoints"
  ON webhook_endpoints FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access webhook_deliveries"
  ON webhook_deliveries FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
