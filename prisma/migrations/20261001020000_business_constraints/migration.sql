-- Keep core invariants valid even when a maintenance script bypasses Zod.
ALTER TABLE "Student" ADD CONSTRAINT "Student_dueDay_range" CHECK ("dueDay" BETWEEN 1 AND 31);
ALTER TABLE "Student" ADD CONSTRAINT "Student_monthlyFee_nonnegative" CHECK ("monthlyFee" >= 0);
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_value_range" CHECK ("value" >= 0 AND "value" <= 10);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_referenceMonth_range" CHECK ("referenceMonth" BETWEEN 1 AND 12);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_referenceYear_range" CHECK ("referenceYear" BETWEEN 2000 AND 2100);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_nonnegative" CHECK ("amount" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paidAt_consistency" CHECK (("status" = 'PAID' AND "paidAt" IS NOT NULL) OR ("status" <> 'PAID' AND "paidAt" IS NULL));
ALTER TABLE "PhysicalMeasurement" ADD CONSTRAINT "PhysicalMeasurement_height_range" CHECK ("height" IS NULL OR "height" BETWEEN 30 AND 250);
ALTER TABLE "PhysicalMeasurement" ADD CONSTRAINT "PhysicalMeasurement_weight_range" CHECK ("weight" IS NULL OR "weight" BETWEEN 1 AND 300);
ALTER TABLE "PhysicalMeasurement" ADD CONSTRAINT "PhysicalMeasurement_at_least_one" CHECK ("height" IS NOT NULL OR "weight" IS NOT NULL);
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_dueSoonDays_range" CHECK ("dueSoonDays" BETWEEN 0 AND 30);
