-- Sleeves come in three lengths: short, three-quarter and long, each with its
-- own round sleeve (how wide the opening is). Customers measure the ones that
-- match the styles they want, so every sleeve measurement is optional.
-- "sleeveLength" becomes the long sleeve and "bicep" the short round sleeve,
-- so existing profiles keep their values.

-- 1. New measurements.
INSERT INTO "MeasurementFieldDef" ("key", "label", "unit", "required", "garments", "sortOrder", "minCm", "maxCm") VALUES
  ('sleeveShort',             'Short sleeve length',          'cm', false, '{top,set,agbada}', 14, 12, 40),
  ('sleeveThreeQuarter',      'Three-quarter sleeve length',  'cm', false, '{top,set,agbada}', 15, 30, 60),
  ('roundSleeveThreeQuarter', 'Round sleeve (three-quarter)', 'cm', false, '{top,set,agbada}', 18, 18, 45),
  ('roundSleeveLong',         'Round sleeve (long)',          'cm', false, '{top,set,agbada}', 19, 13, 30)
ON CONFLICT ("key") DO NOTHING;

-- 2. Existing sleeve measurements: new names, optional, and in order after
--    the short and three-quarter options. Only where they still hold the
--    starter values, so an administrator's edits are kept.
UPDATE "MeasurementFieldDef" SET "label" = 'Long sleeve length' WHERE "key" = 'sleeveLength' AND "label" = 'Sleeve length';
UPDATE "MeasurementFieldDef" SET "label" = 'Round sleeve (short)' WHERE "key" = 'bicep' AND "label" = 'Upper arm';
UPDATE "MeasurementFieldDef" SET "required" = false WHERE "key" = 'sleeveLength';
UPDATE "MeasurementFieldDef" SET "sortOrder" = 16 WHERE "key" = 'sleeveLength' AND "sortOrder" = 14;
UPDATE "MeasurementFieldDef" SET "sortOrder" = 17 WHERE "key" = 'bicep' AND "sortOrder" = 15;
UPDATE "MeasurementFieldDef" SET "sortOrder" = 26 WHERE "key" = 'length' AND "sortOrder" = 16;

-- 3. Wherever a style or product asks for the sleeve length, offer all three.
INSERT INTO "_CategoryMeasurementFields" ("A", "B")
SELECT x."A", k.key
FROM "_CategoryMeasurementFields" x
CROSS JOIN (VALUES ('sleeveShort'), ('sleeveThreeQuarter'), ('roundSleeveThreeQuarter'), ('roundSleeveLong')) AS k(key)
WHERE x."B" = 'sleeveLength'
ON CONFLICT DO NOTHING;

INSERT INTO "_ProductMeasurementFields" ("A", "B")
SELECT k.key, x."B"
FROM "_ProductMeasurementFields" x
CROSS JOIN (VALUES ('sleeveShort'), ('sleeveThreeQuarter'), ('roundSleeveThreeQuarter'), ('roundSleeveLong')) AS k(key)
WHERE x."A" = 'sleeveLength'
ON CONFLICT DO NOTHING;
