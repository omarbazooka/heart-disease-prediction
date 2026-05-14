-- CreateTable
CREATE TABLE "ecg_tests" (
    "id" TEXT NOT NULL,
    "lab_id" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "user_id" TEXT,
    "dat_file_path" TEXT,
    "hea_file_path" TEXT,
    "original_dat_name" TEXT,
    "original_hea_name" TEXT,
    "storage_backend" TEXT NOT NULL DEFAULT 'local',
    "file_size_bytes" INTEGER,
    "checksum_dat" TEXT,
    "checksum_hea" TEXT,
    "primary_diagnosis" TEXT,
    "primary_probability" DOUBLE PRECISION,
    "detailed_results_json" JSONB,
    "model_name" TEXT,
    "model_version" TEXT,
    "inference_status" TEXT NOT NULL DEFAULT 'pending',
    "inference_error" TEXT,
    "inferred_at" TIMESTAMP(3),
    "llm_ecg_json" JSONB,
    "llm_model" TEXT,
    "llm_prompt_version" TEXT,
    "prediction_completed_at" TIMESTAMP(3),
    "uploaded_by" TEXT NOT NULL DEFAULT 'lab_portal',
    "client_request_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecg_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecg_tests_national_id_createdAt_idx" ON "ecg_tests"("national_id", "createdAt");

-- CreateIndex
CREATE INDEX "ecg_tests_lab_id_idx" ON "ecg_tests"("lab_id");

-- AddForeignKey
ALTER TABLE "ecg_tests" ADD CONSTRAINT "ecg_tests_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "labs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecg_tests" ADD CONSTRAINT "ecg_tests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
