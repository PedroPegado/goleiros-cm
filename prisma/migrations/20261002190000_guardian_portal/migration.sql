ALTER TABLE "Student"
ADD COLUMN "guardianAccessCodeHash" TEXT,
ADD COLUMN "guardianAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guardianAccessVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Student_guardianAccessCodeHash_key" ON "Student"("guardianAccessCodeHash");
ALTER TABLE "Evaluation" ADD COLUMN "guardianFeedback" TEXT;
