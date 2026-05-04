-- Phase 3: Billing & Payment

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE IF NOT EXISTS test_prices (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type_id  uuid          NOT NULL REFERENCES test_types(id),
  price_type    text          NOT NULL CHECK (price_type IN ('walk_in','referral','campaign','corporate','hmo')),
  amount        numeric(10,2) NOT NULL,
  currency      text          NOT NULL DEFAULT 'NGN',
  is_active     boolean       NOT NULL DEFAULT true,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(test_type_id, price_type)
);

CREATE TABLE IF NOT EXISTS invoices (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   text          UNIQUE NOT NULL
                                 DEFAULT 'OSC-INV-' || to_char(now(),'YYYY') || '-'
                                        || LPAD(nextval('invoice_seq')::text, 4, '0'),
  order_id         uuid          REFERENCES orders(id),
  application_id   uuid          REFERENCES applications(id),
  patient_name     text          NOT NULL,
  line_items       jsonb         NOT NULL DEFAULT '[]',
  subtotal         numeric(10,2) NOT NULL DEFAULT 0,
  discount         numeric(10,2) NOT NULL DEFAULT 0,
  total            numeric(10,2) NOT NULL DEFAULT 0,
  payment_status   text          NOT NULL DEFAULT 'unpaid'
                                 CHECK (payment_status IN ('unpaid','pending_verification','paid')),
  due_date         date,
  notes            text,
  created_by       uuid          REFERENCES auth.users(id),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT invoice_has_source CHECK (order_id IS NOT NULL OR application_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_order  ON invoices(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id           uuid          NOT NULL REFERENCES invoices(id),
  amount               numeric(10,2) NOT NULL,
  payment_method       text          NOT NULL
                                     CHECK (payment_method IN ('paystack','cash','pos','transfer','insurance','corporate')),
  paystack_reference   text,
  paystack_status      text,
  verified_by          uuid          REFERENCES auth.users(id),
  verified_at          timestamptz,
  payment_date         timestamptz   NOT NULL DEFAULT now(),
  notes                text,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

ALTER TABLE test_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role access test_prices" ON test_prices;
DROP POLICY IF EXISTS "Role access invoices"    ON invoices;
DROP POLICY IF EXISTS "Role access payments"    ON payments;

CREATE POLICY "Role access test_prices" ON test_prices FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk','lab_scientist','doctor'))
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Role access invoices" ON invoices FOR ALL
  USING (get_my_role() IN ('admin','finance','front_desk'))
  WITH CHECK (get_my_role() IN ('admin','finance','front_desk'));

CREATE POLICY "Role access payments" ON payments FOR ALL
  USING (get_my_role() IN ('admin','finance'))
  WITH CHECK (get_my_role() IN ('admin','finance','front_desk'));

DROP TRIGGER IF EXISTS trg_invoices_updated_at    ON invoices;
DROP TRIGGER IF EXISTS trg_test_prices_updated_at ON test_prices;

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_test_prices_updated_at
  BEFORE UPDATE ON test_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
