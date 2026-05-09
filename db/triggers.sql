-- ─── Triggers (applied manually or via migration) ─────────────────────────────
-- These are Postgres triggers that enforce business rules at the DB level.
-- Run via: Supabase SQL Editor or psql

-- ─── 1. Auto-insert into agent_status_history on status change ────────────────

CREATE OR REPLACE FUNCTION fn_agent_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    INSERT INTO agent_status_history (
      agent_id,
      from_status,
      to_status,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.application_status,
      NEW.application_status,
      NOW()
    );

    -- Update the relevant timestamp column
    CASE NEW.application_status
      WHEN 'contacted' THEN NEW.contacted_at = NOW();
      WHEN 'qualified' THEN NEW.qualified_at = NOW();
      WHEN 'approved'  THEN NEW.approved_at  = NOW();
      WHEN 'rejected'  THEN NEW.rejected_at  = NOW();
      WHEN 'active'    THEN NEW.last_active_at = NOW();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_agent_status_change ON agents;
CREATE TRIGGER trg_agent_status_change
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION fn_agent_status_change();

-- ─── 2. Auto-update updated_at on any table that has it ───────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to agents
DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- Apply to profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- Apply to deals
DROP TRIGGER IF EXISTS trg_deals_updated_at ON deals;
CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- Apply to cms_pages
DROP TRIGGER IF EXISTS trg_cms_pages_updated_at ON cms_pages;
CREATE TRIGGER trg_cms_pages_updated_at
  BEFORE UPDATE ON cms_pages
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- Apply to cms_sections
DROP TRIGGER IF EXISTS trg_cms_sections_updated_at ON cms_sections;
CREATE TRIGGER trg_cms_sections_updated_at
  BEFORE UPDATE ON cms_sections
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- Apply to cms_form_schemas
DROP TRIGGER IF EXISTS trg_cms_form_schemas_updated_at ON cms_form_schemas;
CREATE TRIGGER trg_cms_form_schemas_updated_at
  BEFORE UPDATE ON cms_form_schemas
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();
