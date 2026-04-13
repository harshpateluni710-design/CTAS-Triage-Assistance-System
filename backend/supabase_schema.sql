-- ============================================================================
-- CTAS (Computerised Triage Assistance System) – Supabase / PostgreSQL Schema
-- ============================================================================
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this ENTIRE file
--   3. Click "Run" (runs all statements top-to-bottom)
--   Safe to re-run — all statements are idempotent.
-- ============================================================================

-- Enable UUID extension (Supabase has this by default, but just in case)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE (patients, doctors, admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL       PRIMARY KEY,
    email           TEXT            NOT NULL UNIQUE,
    password        TEXT            NOT NULL,
    role            TEXT            NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    full_name       TEXT            NOT NULL DEFAULT '',
    phone           TEXT            DEFAULT '',
    date_of_birth   TEXT            DEFAULT '',
    -- Doctor-specific fields
    license_number  TEXT            DEFAULT '',
    specialty       TEXT            DEFAULT '',
    hospital        TEXT            DEFAULT '',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Index for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users (email, role);

-- ============================================================================
-- 2. ASSESSMENTS TABLE (patient triage history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessments (
    id              BIGSERIAL       PRIMARY KEY,
    patient_id      BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symptoms        TEXT            NOT NULL,
    extracted_data  JSONB           DEFAULT '{}'::jsonb,
    formatted_text  TEXT            DEFAULT '',
    recommendation  TEXT            DEFAULT '',
    tier            INTEGER         DEFAULT 0,
    confidence      REAL            DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Optional denormalized validation snapshot on assessment rows
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS validated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'assessments_validation_status_check'
    ) THEN
        ALTER TABLE assessments
            ADD CONSTRAINT assessments_validation_status_check
            CHECK (validation_status IN ('pending', 'agreed', 'disagreed'));
    END IF;
END $$;

-- Index for fetching a patient's history
CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_validation_status ON assessments (validation_status);
CREATE INDEX IF NOT EXISTS idx_assessments_validated_by ON assessments (validated_by);

-- ============================================================================
-- 3. VALIDATIONS TABLE (doctor case validations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS validations (
    id              BIGSERIAL       PRIMARY KEY,
    assessment_id   BIGINT          NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    doctor_id       BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_correct      BOOLEAN         NOT NULL DEFAULT true,
    doctor_tier     INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (assessment_id, doctor_id)
);

-- Index for finding unvalidated assessments per doctor
CREATE INDEX IF NOT EXISTS idx_validations_doctor ON validations (doctor_id);

-- Backfill denormalized assessment validation snapshot from latest validation row
UPDATE assessments a
SET
    validation_status = CASE WHEN v.is_correct THEN 'agreed' ELSE 'disagreed' END,
    validated_by = v.doctor_id,
    validated_at = v.created_at
FROM (
    SELECT DISTINCT ON (assessment_id)
        assessment_id,
        doctor_id,
        is_correct,
        created_at
    FROM validations
    ORDER BY assessment_id, created_at DESC
) v
WHERE a.id = v.assessment_id;

-- ============================================================================
-- 4. PROTOCOLS TABLE (clinical knowledge base)
-- ============================================================================
CREATE TABLE IF NOT EXISTS protocols (
    id              BIGSERIAL       PRIMARY KEY,
    title           TEXT            NOT NULL UNIQUE,
    type            TEXT            DEFAULT '',
    description     TEXT            DEFAULT '',
    criteria        JSONB           DEFAULT '[]'::jsonb,
    active          BOOLEAN         DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. AUTO-UPDATE updated_at TRIGGER FOR PROTOCOLS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protocols_updated_at ON protocols;
CREATE TRIGGER trg_protocols_updated_at
    BEFORE UPDATE ON protocols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
--    Uses DROP + CREATE so the script is safe to re-run.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols   ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "Service role full access on users"       ON users;
DROP POLICY IF EXISTS "Service role full access on assessments" ON assessments;
DROP POLICY IF EXISTS "Service role full access on validations" ON validations;
DROP POLICY IF EXISTS "Service role full access on protocols"   ON protocols;

-- Allow full access for the service_role (your backend uses this key)
CREATE POLICY "Service role full access on users"       ON users       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on assessments" ON assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on validations" ON validations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on protocols"   ON protocols   FOR ALL USING (true) WITH CHECK (true);


INSERT INTO users (email, password, role, full_name)
VALUES (
    'admin@ctas.com',
    'scrypt:32768:8:1$wznOSVFyGhSVwMSm$044dabc8190f9626b67aaf8596104a3cae12bd881ec8913489f8abea107a955abfc8a27d6ab3c25441e90448932a5c61cb17d51fe084d16f730b6485c067f332',
    'admin',
    'System Admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 8. SEED DATA – Default Clinical Protocols
-- ============================================================================
INSERT INTO protocols (title, type, description, criteria) VALUES
(
    'Emergency Severity Index (ESI) Level 1',
    'ESI',
    'Immediate life-threatening conditions requiring immediate intervention',
    '["Cardiac arrest or peri-arrest", "Severe respiratory distress", "Major trauma with airway compromise", "Unresponsive or altered mental status"]'::jsonb
)
ON CONFLICT (title) DO NOTHING;

INSERT INTO protocols (title, type, description, criteria) VALUES
(
    'Manchester Triage System - Urgent',
    'MTS',
    'Serious conditions requiring rapid assessment and treatment',
    '["Severe pain (7-10/10)", "Persistent vomiting", "High fever with concerning symptoms", "Moderate bleeding"]'::jsonb
)
ON CONFLICT (title) DO NOTHING;

INSERT INTO protocols (title, type, description, criteria) VALUES
(
    'Standard Self-Care Protocol',
    'Standard',
    'Minor conditions suitable for self-management with monitoring',
    '["Minor cuts or bruises", "Mild cold symptoms", "Low-grade fever", "Minor aches and pains"]'::jsonb
)
ON CONFLICT (title) DO NOTHING;
