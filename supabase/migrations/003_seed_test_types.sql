-- Seed: Diagnostic Test Types
INSERT INTO test_types (name, category, description) VALUES
  ('Full Blood Count',             'Haematology',      'Complete blood count including RBC, WBC, haemoglobin, platelets'),
  ('Malaria Parasite',             'Parasitology',     'Microscopy for malaria parasites'),
  ('HIV Screening',                'Serology',         'Rapid test for HIV 1 & 2 antibodies'),
  ('Hepatitis B Surface Antigen',  'Serology',         'Detects HBsAg for Hepatitis B infection'),
  ('Lipid Profile',                'Biochemistry',     'Total cholesterol, LDL, HDL, triglycerides'),
  ('Liver Function Test',          'Biochemistry',     'ALT, AST, ALP, bilirubin, albumin'),
  ('Kidney Function Test',         'Biochemistry',     'Urea, creatinine, electrolytes'),
  ('Urinalysis',                   'Microbiology',     'Physical, chemical, and microscopic urine exam'),
  ('Blood Glucose (Fasting)',      'Biochemistry',     'Fasting blood sugar level'),
  ('Thyroid Function Test',        'Endocrinology',    'TSH, T3, T4 panel'),
  ('Pregnancy Test',               'Reproductive',     'Urine hCG rapid test'),
  ('Widal Test',                   'Serology',         'Typhoid fever antibody test'),
  ('Blood Culture',                'Microbiology',     'Bacterial growth detection in blood'),
  ('Sickle Cell Screening',        'Haematology',      'Haemoglobin electrophoresis for sickle cell'),
  ('COVID-19 PCR',                 'Virology',         'Nucleic acid amplification for SARS-CoV-2');

-- Seed: Partner Pickup Locations
INSERT INTO pickup_locations (name, address, city, state) VALUES
  ('HealthPlus Pharmacy, Victoria Island', '1 Adeola Odeku Street', 'Lagos', 'Lagos'),
  ('HealthPlus Pharmacy, Lekki',           '15 Admiralty Way',       'Lagos', 'Lagos'),
  ('MedPlus Pharmacy, Ikeja',              '32 Oba Akran Avenue',    'Ikeja', 'Lagos'),
  ('Drugfield Pharmacy, Abuja',            '5 Cadastral Zone',       'Abuja', 'FCT'),
  ('CarePlus Clinic, Port Harcourt',       '10 Rumuola Road',        'Port Harcourt', 'Rivers');
