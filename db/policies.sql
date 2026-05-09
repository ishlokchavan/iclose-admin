-- ─── RLS Policies (versioned reference) ──────────────────────────────────────
-- Enable RLS on all tables, then define per-role policies.
-- Applied via Supabase SQL Editor or psql with service role key.
-- IMPORTANT: Run triggers.sql first.

-- Helper: get the role of the current authenticated user from profiles
-- Used in policy expressions — faster than a subquery every time.
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles: self read"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles: admin read"
  ON profiles FOR SELECT
  USING (auth_role() IN ('super_admin', 'content_manager', 'agent_manager', 'auditor'));

-- Only super_admin can insert/update profiles (agent creation goes via service role)
CREATE POLICY "profiles: super_admin write"
  ON profiles FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

-- ─── agents ───────────────────────────────────────────────────────────────────

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- agent_manager + super_admin: full read/write
CREATE POLICY "agents: manager write"
  ON agents FOR ALL
  USING (auth_role() IN ('super_admin', 'agent_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'agent_manager'));

-- auditor + content_manager: read only
CREATE POLICY "agents: admin read"
  ON agents FOR SELECT
  USING (auth_role() IN ('auditor', 'content_manager'));

-- Agent: read own row via profile_id
CREATE POLICY "agents: self read"
  ON agents FOR SELECT
  USING (profile_id = auth.uid());

-- Public insert for registration (anon key) — restricted columns only
-- Application code uses service role for the actual insert, so this is belt-and-suspenders
CREATE POLICY "agents: public register"
  ON agents FOR INSERT
  WITH CHECK (profile_id IS NULL AND application_status = 'applied');

-- ─── agent_notes ──────────────────────────────────────────────────────────────

ALTER TABLE agent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_notes: manager write"
  ON agent_notes FOR ALL
  USING (auth_role() IN ('super_admin', 'agent_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'agent_manager'));

CREATE POLICY "agent_notes: auditor read"
  ON agent_notes FOR SELECT
  USING (auth_role() = 'auditor');

-- ─── agent_status_history ─────────────────────────────────────────────────────

ALTER TABLE agent_status_history ENABLE ROW LEVEL SECURITY;

-- All admin roles can read — no one can write directly (trigger only)
CREATE POLICY "status_history: admin read"
  ON agent_status_history FOR SELECT
  USING (auth_role() IN ('super_admin', 'agent_manager', 'auditor', 'content_manager'));

-- Agent: read own status history
CREATE POLICY "status_history: self read"
  ON agent_status_history FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
  );

-- ─── deals ────────────────────────────────────────────────────────────────────

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals: manager write"
  ON deals FOR ALL
  USING (auth_role() IN ('super_admin', 'agent_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'agent_manager'));

CREATE POLICY "deals: auditor read"
  ON deals FOR SELECT
  USING (auth_role() = 'auditor');

-- Agent: read own deals
CREATE POLICY "deals: agent read own"
  ON deals FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
  );

-- ─── commission_advances ──────────────────────────────────────────────────────

ALTER TABLE commission_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advances: manager write"
  ON commission_advances FOR ALL
  USING (auth_role() IN ('super_admin', 'agent_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'agent_manager'));

CREATE POLICY "advances: auditor read"
  ON commission_advances FOR SELECT
  USING (auth_role() = 'auditor');

-- Agent: read own + insert own requests
CREATE POLICY "advances: agent read own"
  ON commission_advances FOR SELECT
  USING (
    agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
  );

CREATE POLICY "advances: agent insert own"
  ON commission_advances FOR INSERT
  WITH CHECK (
    agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
    AND status = 'requested'
  );

-- ─── cms_pages ────────────────────────────────────────────────────────────────

ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_pages: editor write"
  ON cms_pages FOR ALL
  USING (auth_role() IN ('super_admin', 'content_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'content_manager'));

-- Auditor read
CREATE POLICY "cms_pages: auditor read"
  ON cms_pages FOR SELECT
  USING (auth_role() = 'auditor');

-- Public read of published_json only — enforced at API layer, RLS allows all selects
-- (The API route filters to published_json only)
CREATE POLICY "cms_pages: public read"
  ON cms_pages FOR SELECT
  USING (published_at IS NOT NULL);

-- ─── cms_sections ─────────────────────────────────────────────────────────────

ALTER TABLE cms_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_sections: editor write"
  ON cms_sections FOR ALL
  USING (auth_role() IN ('super_admin', 'content_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'content_manager'));

CREATE POLICY "cms_sections: public read"
  ON cms_sections FOR SELECT
  USING (true); -- filtered at API layer

-- ─── cms_media ────────────────────────────────────────────────────────────────

ALTER TABLE cms_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_media: editor write"
  ON cms_media FOR ALL
  USING (auth_role() IN ('super_admin', 'content_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'content_manager'));

CREATE POLICY "cms_media: public read"
  ON cms_media FOR SELECT
  USING (true);

-- ─── cms_form_schemas ─────────────────────────────────────────────────────────

ALTER TABLE cms_form_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_schemas: editor write"
  ON cms_form_schemas FOR ALL
  USING (auth_role() IN ('super_admin', 'content_manager'))
  WITH CHECK (auth_role() IN ('super_admin', 'content_manager'));

CREATE POLICY "form_schemas: public read active"
  ON cms_form_schemas FOR SELECT
  USING (is_active = true); -- public can only see active schemas

-- ─── site_config ──────────────────────────────────────────────────────────────

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_config: super_admin write"
  ON site_config FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "site_config: admin read"
  ON site_config FOR SELECT
  USING (auth_role() IN ('super_admin', 'content_manager', 'agent_manager', 'auditor'));

-- Public read (for /api/cms/site endpoint — service role bypasses this)
CREATE POLICY "site_config: public read"
  ON site_config FOR SELECT
  USING (true);

-- ─── audit_logs ───────────────────────────────────────────────────────────────

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read only — no direct writes allowed (service role only via application code)
CREATE POLICY "audit_logs: super_admin read"
  ON audit_logs FOR SELECT
  USING (auth_role() IN ('super_admin', 'auditor'));
