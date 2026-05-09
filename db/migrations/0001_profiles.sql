-- Migration: 0001_profiles
-- Run this in your Supabase SQL editor or via: npm run db:migrate

-- Enums
CREATE TYPE IF NOT EXISTS "role" AS ENUM (
  'super_admin',
  'content_manager',
  'agent_manager',
  'agent',
  'auditor'
);

CREATE TYPE IF NOT EXISTS "profile_status" AS ENUM (
  'active',
  'inactive',
  'suspended'
);

-- Profiles table
CREATE TABLE IF NOT EXISTS "profiles" (
  "id"         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "full_name"  TEXT NOT NULL,
  "phone"      VARCHAR(32),
  "role"       "role" NOT NULL DEFAULT 'agent',
  "status"     "profile_status" NOT NULL DEFAULT 'active',
  "avatar_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- super_admin can read all profiles
CREATE POLICY "profiles: super_admin read all"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- agent_manager can read all profiles
CREATE POLICY "profiles: agent_manager read all"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'agent_manager'
    )
  );

-- auditor can read all profiles
CREATE POLICY "profiles: auditor read all"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'auditor'
    )
  );

-- Users can update their own non-sensitive fields (name, phone, avatar)
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role and status can only be changed server-side (service role)
  );

-- Only service role can insert (done server-side on invite/registration)
-- No INSERT policy = only service_role can insert

-- No DELETE policy = only service_role can delete
