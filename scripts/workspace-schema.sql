-- Additive pilot workspace schema. Existing application/receipt storage is unchanged.
CREATE TABLE IF NOT EXISTS wave_workspaces (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wave_workspace_members ON wave_workspaces USING GIN ((state -> 'members'));
CREATE INDEX IF NOT EXISTS wave_workspace_status ON wave_workspaces ((state ->> 'status'));
CREATE TABLE IF NOT EXISTS wave_workspace_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
-- Periodic housekeeping may delete limits with expires_at < now().
