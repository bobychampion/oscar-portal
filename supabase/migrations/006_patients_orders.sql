-- Phase 2: Patient Records + Test Ordering

CREATE SEQUENCE patient_seq START 1;

CREATE TABLE patients (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        text        UNIQUE NOT NULL
                                DEFAULT 'OSC-P-' || LPAD(nextval('patient_seq')::text, 5, '0'),
  full_name         text        NOT NULL,
  date_of_birth     date        NOT NULL,
  gender            text        NOT NULL CHECK (gender IN ('male','female','other')),
  phone             text        NOT NULL,
  email             text,
  address           text,
  city              text        NOT NULL,
  state             text        NOT NULL,
  next_of_kin_name  text,
  next_of_kin_phone text,
  hmo_provider      text,
  hmo_number        text,
  blood_group       text,
  genotype          text,
  notes             text,
  created_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_name  ON patients(full_name);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_pid   ON patients(patient_id);

CREATE SEQUENCE order_seq START 1;

CREATE TABLE orders (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         text        UNIQUE NOT NULL
                                   DEFAULT 'OSC-ORD-' || to_char(now(),'YYYY') || '-'
                                          || LPAD(nextval('order_seq')::text, 4, '0'),
  patient_id           uuid        NOT NULL REFERENCES patients(id),
  order_type           text        NOT NULL CHECK (order_type IN ('walk_in','referral','corporate','home_service')),
  priority             text        NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status               text        NOT NULL DEFAULT 'pending_payment'
                                   CHECK (status IN ('pending_payment','paid','sample_collected','processing','complete','cancelled')),
  referring_doctor_id  uuid        REFERENCES user_profiles(id),
  corporate_client     text,
  notes                text,
  created_by           uuid        REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  test_type_id  uuid NOT NULL REFERENCES test_types(id),
  UNIQUE(order_id, test_type_id)
);

CREATE TABLE order_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  test_type_id     uuid        NOT NULL REFERENCES test_types(id),
  result_value     text        NOT NULL,
  unit             text,
  reference_range  text,
  interpretation   text        NOT NULL CHECK (interpretation IN ('normal','abnormal','critical')),
  notes            text,
  entered_by       uuid        REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, test_type_id)
);

-- Link public applications to a patient record
ALTER TABLE applications ADD COLUMN patient_id uuid REFERENCES patients(id);

-- RLS
ALTER TABLE patients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role access patients" ON patients FOR ALL
  USING (get_my_role() IN ('admin','front_desk','lab_scientist','finance'))
  WITH CHECK (get_my_role() IN ('admin','front_desk'));

CREATE POLICY "Role access orders" ON orders FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor'))
  WITH CHECK (get_my_role() IN ('admin','front_desk'));

CREATE POLICY "Role access order_tests" ON order_tests FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist'))
  WITH CHECK (get_my_role() IN ('admin','front_desk'));

CREATE POLICY "Role access order_results" ON order_results FOR ALL
  USING (get_my_role() IN ('admin','lab_scientist','finance','doctor'))
  WITH CHECK (get_my_role() IN ('admin','lab_scientist'));

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_order_results_updated_at
  BEFORE UPDATE ON order_results FOR EACH ROW EXECUTE FUNCTION update_updated_at();
