-- A delivery zone can name the states it covers (e.g. Lagos); empty means the
-- whole country, and a state zone is chosen before it.
ALTER TABLE "DeliveryZone" ADD COLUMN "states" TEXT[] DEFAULT ARRAY[]::TEXT[];
