-- Measurement guide: one definition per body measurement. Which garment
-- pieces (robe / top / trousers) a style needs is set per category, so an
-- Agbada asks for robe + inner top + trousers and a Kaftan for top + trousers.
-- Copy for each measurement lives in the storefront guide; definition text is
-- only an override, so starter seed text is cleared and admin edits are kept.

-- 1. New measurements.
INSERT INTO "MeasurementFieldDef" ("key", "label", "unit", "required", "garments", "sortOrder", "minCm", "maxCm") VALUES
  ('agbadaLength', 'Agbada length', 'cm', true,  '{agbada}', 1, 110, 165),
  ('agbadaWidth',  'Agbada width (wrist to wrist)', 'cm', true, '{agbada}', 2, 120, 220),
  ('stomach',      'Stomach', 'cm', true,  '{top,set,agbada}', 13, 60, 180),
  ('bicep',        'Upper arm', 'cm', false, '{top,set,agbada}', 15, 20, 55),
  ('thigh',        'Thigh', 'cm', false, '{trouser,set,agbada}', 22, 40, 90),
  ('trouserLength','Trouser length', 'cm', true, '{trouser,set,agbada}', 23, 80, 125),
  ('ankle',        'Trouser bottom', 'cm', false, '{trouser,set,agbada}', 24, 25, 60)
ON CONFLICT ("key") DO NOTHING;

-- 2. Existing measurements: friendlier labels, order, ranges and garments,
--    only where they still hold the original starter values.
UPDATE "MeasurementFieldDef" SET "label" = 'Shoulder width' WHERE "key" = 'shoulder' AND "label" = 'Shoulder';
UPDATE "MeasurementFieldDef" SET "label" = 'Sleeve length'  WHERE "key" = 'sleeveLength' AND "label" = 'Sleeve Length';
UPDATE "MeasurementFieldDef" SET "label" = 'Top length'     WHERE "key" = 'length' AND "label" IN ('Length', 'Top Length');
UPDATE "MeasurementFieldDef" SET "label" = 'Inside leg'     WHERE "key" = 'inseam' AND "label" IN ('Inseam', 'Inside Leg');

UPDATE "MeasurementFieldDef" AS d SET
  "sortOrder" = v.sort_order,
  "minCm" = COALESCE(d."minCm", v.min_cm),
  "maxCm" = COALESCE(d."maxCm", v.max_cm)
FROM (VALUES
  ('neck', 10, 28, 60), ('shoulder', 11, 33, 65), ('chest', 12, 70, 170),
  ('sleeveLength', 14, 45, 80), ('length', 16, 55, 130),
  ('waist', 20, 55, 170), ('hip', 21, 70, 180), ('inseam', 90, 60, 100)
) AS v(key, sort_order, min_cm, max_cm)
WHERE d."key" = v.key;

-- Agbada trousers use the same waist and hip.
UPDATE "MeasurementFieldDef" SET "garments" = '{trouser,set,agbada}'
WHERE "key" IN ('waist', 'hip') AND "garments" = '{trouser,set}'::"Garment"[];
-- Trouser length replaces inside leg in the defaults; inside leg stays
-- available for older profiles and for styles that choose it explicitly.
UPDATE "MeasurementFieldDef" SET "garments" = '{}', "required" = false
WHERE "key" = 'inseam' AND "garments" = '{trouser,set}'::"Garment"[];

-- 3. Clear starter copy so the storefront's step-by-step guide shows.
UPDATE "MeasurementFieldDef" SET "description" = NULL WHERE "description" IN (
  'Chest circumference.', 'Neck circumference.', 'Shoulder-to-shoulder width.', 'Shoulder seam to wrist.',
  'Waist circumference.', 'Hip circumference.', 'Crotch to ankle.', 'Full garment length, nape to hem.',
  'The fullest part around your chest.', 'Around the base of the neck where a collar sits.',
  'Across the back from one shoulder edge to the other.', 'From the shoulder edge to the wrist bone.',
  'Around where your trouser waistband normally sits.', 'Around the fullest part of the seat.',
  'From the top of the inside leg to the ankle.', 'From the base of the neck to the intended hem.');
UPDATE "MeasurementFieldDef" SET "instructions" = NULL, "commonMistakes" = NULL
WHERE "key" IN ('chest', 'neck', 'shoulder', 'sleeveLength', 'waist', 'hip', 'inseam', 'length')
  AND "instructions" IN (
    'Wrap the tape under your arms and around the fullest part of your chest. Start and finish at the front.',
    'Wrap the tape around the base of your neck and leave room for one finger.',
    'Measure across your back from the edge of one shoulder to the other, where a shoulder seam would sit.',
    'Start at the shoulder edge, follow the outside of a slightly bent arm, and stop at the wrist bone.',
    'Wrap the tape around your usual waistband, keeping it level. Breathe normally.',
    'Stand with feet together and wrap the tape around the fullest part of your seat.',
    'Start at the top of the inside leg and measure straight down to the ankle.',
    'Start at the base of the neck and measure straight down to the hem you want.');

-- 4. Remove the per-piece duplicates an unreleased seed created
--    (agbadaOuterChest, innerTopChest, kaftanTrouserWaist, …). Pieces are now
--    derived from the style, so one "chest" serves every top.
DELETE FROM "MeasurementFieldDef" WHERE "key" IN (
  'agbadaOuterChest', 'agbadaOuterLength', 'agbadaOuterSleeveLength',
  'innerTopChest', 'innerTopShoulder', 'innerTopSleeveLength', 'innerTopLength', 'innerTopNeck',
  'agbadaTrouserWaist', 'agbadaTrouserHip', 'agbadaTrouserInseam',
  'kaftanChest', 'kaftanShoulder', 'kaftanSleeveLength', 'kaftanLength',
  'kaftanTrouserWaist', 'kaftanTrouserHip', 'kaftanTrouserInseam');

-- 5. What each bespoke style needs. Only for categories with nothing
--    configured yet, so an administrator's choices are never overwritten.
WITH style(slug, keys) AS (VALUES
  ('agbada',  ARRAY['agbadaLength','agbadaWidth','neck','shoulder','chest','stomach','sleeveLength','bicep','length','waist','hip','thigh','trouserLength','ankle']),
  ('kaftans', ARRAY['neck','shoulder','chest','stomach','sleeveLength','bicep','length','waist','hip','thigh','trouserLength','ankle']),
  ('senator', ARRAY['neck','shoulder','chest','stomach','sleeveLength','bicep','length','waist','hip','thigh','trouserLength','ankle']),
  ('jalabia', ARRAY['neck','shoulder','chest','stomach','sleeveLength','bicep','length']),
  ('shirts',  ARRAY['neck','shoulder','chest','stomach','sleeveLength','bicep','length']),
  ('pants',   ARRAY['waist','hip','thigh','trouserLength','ankle'])
)
INSERT INTO "_CategoryMeasurementFields" ("A", "B")
SELECT c."id", k.key
FROM style s
JOIN "Category" c ON c."slug" = s.slug
CROSS JOIN LATERAL unnest(s.keys) AS k(key)
JOIN "MeasurementFieldDef" d ON d."key" = k.key
WHERE NOT EXISTS (SELECT 1 FROM "_CategoryMeasurementFields" x WHERE x."A" = c."id")
ON CONFLICT DO NOTHING;
