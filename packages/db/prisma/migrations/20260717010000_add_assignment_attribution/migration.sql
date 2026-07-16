ALTER TABLE "assignments" ADD COLUMN "assignedBy" TEXT;

CREATE INDEX "assignments_assignedBy_idx" ON "assignments"("assignedBy");

ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_assignedBy_fkey"
FOREIGN KEY ("assignedBy") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
