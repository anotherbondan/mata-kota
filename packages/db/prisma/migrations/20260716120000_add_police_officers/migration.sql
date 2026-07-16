CREATE TABLE "police_officers" (
    "id" TEXT NOT NULL,
    "nrp" VARCHAR(8) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "police_officers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "police_officers_nrp_format_check" CHECK ("nrp" ~ '^[0-9]{8}$')
);

CREATE UNIQUE INDEX "police_officers_nrp_key" ON "police_officers"("nrp");
CREATE UNIQUE INDEX "police_officers_userId_key" ON "police_officers"("userId");

ALTER TABLE "police_officers"
ADD CONSTRAINT "police_officers_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "police_officers" ("id", "nrp", "userId", "createdAt", "updatedAt")
SELECT
    "id",
    substring("email" from '^([0-9]{8})@polri\.go\.id$'),
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user"
WHERE "email" ~ '^[0-9]{8}@polri\.go\.id$'
ON CONFLICT DO NOTHING;
