-- 010_order_results_legacy_columns.sql
-- 008_test_engine.sql introduced result_mode/result_data (jsonb) as the new
-- way to store results, but never relaxed the original NOT NULL/CHECK
-- constraints on result_value/interpretation from 006_patients_orders.sql.
-- The dynamic result template UI never populates those legacy columns, so
-- every insert through it violates the NOT NULL constraints (surfaced by
-- PostgREST as a 500 on the order_results upsert).

ALTER TABLE order_results
  ALTER COLUMN result_value   DROP NOT NULL,
  ALTER COLUMN interpretation DROP NOT NULL;

ALTER TABLE order_results
  DROP CONSTRAINT IF EXISTS order_results_interpretation_check;
