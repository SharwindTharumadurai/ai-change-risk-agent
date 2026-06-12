-- ============================================================
-- AI Change Risk Agent — PostgreSQL Schema
-- Version: 1.0 MVP
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- Multi-tenant root table. Every resource belongs to an org.
-- ============================================================
CREATE TABLE organizations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    plan         VARCHAR(50)  NOT NULL DEFAULT 'free', -- free | pro | enterprise
    settings     JSONB        NOT NULL DEFAULT '{}',   -- cost thresholds, custom rules
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- Engineers, security leads, managers within an org.
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'engineer', -- admin | engineer | readonly
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email  ON users(email);

-- ============================================================
-- ANALYSES
-- One row per uploaded file / change submitted for analysis.
-- ============================================================
CREATE TABLE analyses (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id               UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    file_name            VARCHAR(500) NOT NULL,
    file_type            VARCHAR(50)  NOT NULL, -- terraform | git_diff | cloudformation | kubernetes
    file_size_bytes      INTEGER,
    risk_score           INTEGER      CHECK (risk_score BETWEEN 0 AND 100),
    risk_level           VARCHAR(20)  CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    verdict              VARCHAR(30)  CHECK (verdict IN ('SAFE_TO_DEPLOY','REVIEW_REQUIRED','BLOCK_DEPLOYMENT')),
    confidence           NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
    change_types         TEXT[]       NOT NULL DEFAULT '{}', -- ['IAM','Networking','Compute']
    change_summary       TEXT,
    reasoning_summary    TEXT,
    availability_impact  VARCHAR(20)  CHECK (availability_impact IN ('NONE','LOW','MEDIUM','HIGH','CRITICAL')),
    monthly_cost_delta   NUMERIC(10,2),
    annual_cost_delta    NUMERIC(10,2),
    cost_alert_level     VARCHAR(20)  CHECK (cost_alert_level IN ('NONE','LOW','MEDIUM','HIGH')),
    status               VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending | processing | complete | failed
    error_message        TEXT,
    processing_ms        INTEGER,     -- how long analysis took
    ai_model             VARCHAR(100),-- which model was used
    ai_tokens_used       INTEGER,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ
);

CREATE INDEX idx_analyses_org_id     ON analyses(org_id);
CREATE INDEX idx_analyses_user_id    ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_verdict    ON analyses(verdict);
CREATE INDEX idx_analyses_status     ON analyses(status);

-- ============================================================
-- FINDINGS
-- Individual risk findings within an analysis.
-- One analysis has many findings.
-- ============================================================
CREATE TABLE findings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id      UUID         NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    finding_code     VARCHAR(20)  NOT NULL, -- SEC-001, AVAIL-002, COST-001
    severity         VARCHAR(20)  NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    category         VARCHAR(50)  NOT NULL CHECK (category IN ('Security','Availability','Compliance','Cost')),
    title            VARCHAR(500) NOT NULL,
    resource         VARCHAR(500),  -- aws_security_group.web
    attribute        VARCHAR(500),  -- ingress.cidr_blocks
    evidence         TEXT,          -- the exact value that triggered the finding
    risk_points      INTEGER        NOT NULL DEFAULT 0,
    explanation      TEXT,          -- why this is dangerous
    remediation      TEXT,          -- how to fix it in plain English
    remediation_code TEXT,          -- corrected Terraform snippet
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_analysis_id ON findings(analysis_id);
CREATE INDEX idx_findings_severity    ON findings(severity);
CREATE INDEX idx_findings_category    ON findings(category);

-- ============================================================
-- COMPLIANCE RESULTS
-- Maps each finding to compliance framework controls.
-- One finding can map to multiple controls.
-- ============================================================
CREATE TABLE compliance_results (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id  UUID        NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    finding_id   UUID        REFERENCES findings(id) ON DELETE SET NULL,
    framework    VARCHAR(50) NOT NULL CHECK (framework IN ('CIS','SOC2','ISO27001')),
    control_id   VARCHAR(50) NOT NULL, -- CIS-5.2, SOC2-CC6.1, ISO-A.13.1.1
    control_name VARCHAR(500),
    status       VARCHAR(20) NOT NULL CHECK (status IN ('PASS','FAIL','WARN','NOT_APPLICABLE')),
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_analysis_id ON compliance_results(analysis_id);
CREATE INDEX idx_compliance_framework   ON compliance_results(framework);
CREATE INDEX idx_compliance_status      ON compliance_results(status);

-- ============================================================
-- COST IMPACTS
-- Line-item cost breakdown for each analysis.
-- One analysis has many cost impact rows.
-- ============================================================
CREATE TABLE cost_impacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id     UUID          NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    resource        VARCHAR(500)  NOT NULL, -- aws_instance.app
    resource_type   VARCHAR(100),           -- aws_instance, aws_db_instance
    change_desc     VARCHAR(500)  NOT NULL, -- t3.medium → t3.xlarge
    cost_before_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost_after_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
    delta_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,
    monthly_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_impacts_analysis_id ON cost_impacts(analysis_id);

-- ============================================================
-- AUDIT LOG
-- Immutable record of every user action. Required for SOC2.
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL, -- analysis.created, analysis.viewed, user.login
    resource_id UUID,
    resource_type VARCHAR(50),
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id     ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);

-- ============================================================
-- HELPER: auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: default organization and admin user (for development)
-- ============================================================
INSERT INTO organizations (id, name, slug, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo Organization',
    'demo-org',
    'pro'
);

INSERT INTO users (org_id, email, full_name, role, hashed_password)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@demo.com',
    'Demo Admin',
    'admin',
    '$2b$12$placeholder_replace_with_real_hash'
);
