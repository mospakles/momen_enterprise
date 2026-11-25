INSERT INTO "Coupon" ("id", "code", "type", "value", "scope", "scopeRefs", "perCustomerLimit", "updatedAt")
VALUES ('momen-welcome10', 'WELCOME10', 'percentage', 10, 'first-order', ARRAY[]::TEXT[], 1, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- An older seed created WELCOME10 for every order with no limit. The welcome
-- offer is for a first order only, once per customer.
UPDATE "Coupon" SET "scope" = 'first-order', "perCustomerLimit" = 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'WELCOME10' AND "scope" = 'all' AND "usageCount" = 0;
