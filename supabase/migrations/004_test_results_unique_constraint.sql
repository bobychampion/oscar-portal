ALTER TABLE test_results
  ADD CONSTRAINT test_results_application_test_unique
  UNIQUE (application_id, test_type_id);
