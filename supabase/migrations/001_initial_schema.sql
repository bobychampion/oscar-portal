-- Oscar Labs Diagnostic Portal — Initial Schema

-- 1. Test Types
CREATE TABLE test_types (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  category    text        NOT NULL,
  description text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Pickup Locations (partner pharmacies/clinics)
CREATE TABLE pickup_locations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  address    text        NOT NULL,
  city       text        NOT NULL,
  state      text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Patient Applications
CREATE TABLE applications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number     text        NOT NULL UNIQUE,
  full_name           text        NOT NULL,
  email               text        NOT NULL,
  phone               text        NOT NULL,
  date_of_birth       date        NOT NULL,
  gender              text        NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  city                text        NOT NULL,
  state               text        NOT NULL,
  pickup_location_id  uuid        REFERENCES pickup_locations(id),
  wants_dnpl          boolean     NOT NULL DEFAULT false,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'processing', 'complete', 'cancelled')),
  confirmation_sent   boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 4. Application ↔ Test Type junction
CREATE TABLE application_tests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  test_type_id   uuid NOT NULL REFERENCES test_types(id),
  UNIQUE(application_id, test_type_id)
);

-- 5. Test Results (entered by admin)
CREATE TABLE test_results (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  test_type_id    uuid        NOT NULL REFERENCES test_types(id),
  result_value    text        NOT NULL,
  unit            text,
  reference_range text,
  interpretation  text        NOT NULL CHECK (interpretation IN ('normal', 'abnormal', 'critical')),
  notes           text,
  entered_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 6. Third-party API Keys
CREATE TABLE api_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  key_hash     text        NOT NULL UNIQUE,
  key_prefix   text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 7. Webhook Endpoints (registered partner URLs)
CREATE TABLE webhook_endpoints (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  url        text        NOT NULL,
  secret     text        NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Webhook Deliveries (audit trail)
CREATE TABLE webhook_deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id uuid        NOT NULL REFERENCES webhook_endpoints(id),
  application_id      uuid        NOT NULL REFERENCES applications(id),
  payload             jsonb       NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'success', 'failed', 'permanently_failed')),
  http_status_code    int,
  response_body       text,
  attempt_count       int         NOT NULL DEFAULT 0,
  next_retry_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_applications_tracking  ON applications(tracking_number);
CREATE INDEX idx_applications_status    ON applications(status);
CREATE INDEX idx_applications_email     ON applications(email);
CREATE INDEX idx_applications_created   ON applications(created_at DESC);
CREATE INDEX idx_test_results_app_id    ON test_results(application_id);
CREATE INDEX idx_webhook_del_retry      ON webhook_deliveries(status, next_retry_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_test_results_updated_at
  BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_webhook_deliveries_updated_at
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
