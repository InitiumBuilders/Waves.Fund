-- Give Together: additive schema. Every table lives in the schema named by GIVE_SCHEMA (default public).
-- Nothing here touches the existing application, receipt or workspace storage.
CREATE SCHEMA IF NOT EXISTS {s};

CREATE TABLE IF NOT EXISTS {s}.give_profiles (
  user_id TEXT PRIMARY KEY,
  ref UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  gives TEXT[] NOT NULL DEFAULT '{}',
  causes TEXT[] NOT NULL DEFAULT '{}',
  cause_other TEXT,
  times TEXT[] NOT NULL DEFAULT '{}',
  ways TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  teach TEXT[] NOT NULL DEFAULT '{}',
  learn TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  place TEXT,
  lat REAL,
  lng REAL,
  statement TEXT,
  shares JSONB NOT NULL DEFAULT '{}',
  seeking BOOLEAN NOT NULL DEFAULT FALSE,
  adult BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS {s}.give_connections (
  id UUID PRIMARY KEY,
  requester TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  ended_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS give_connections_live_pair ON {s}.give_connections (LEAST(requester, recipient), GREATEST(requester, recipient)) WHERE status IN ('pending', 'accepted');
CREATE INDEX IF NOT EXISTS give_connections_requester ON {s}.give_connections (requester);
CREATE INDEX IF NOT EXISTS give_connections_recipient ON {s}.give_connections (recipient);

CREATE TABLE IF NOT EXISTS {s}.give_messages (
  id UUID PRIMARY KEY,
  connection_id UUID NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS give_messages_thread ON {s}.give_messages (connection_id, created_at);

CREATE TABLE IF NOT EXISTS {s}.give_blocks (
  blocker TEXT NOT NULL,
  blocked TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker, blocked)
);

CREATE TABLE IF NOT EXISTS {s}.give_reports (
  id UUID PRIMARY KEY,
  reporter TEXT NOT NULL,
  reported TEXT,
  connection_id UUID,
  opportunity_id UUID,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS {s}.give_opportunities (
  id UUID PRIMARY KEY,
  created_by TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  need TEXT NOT NULL,
  cause TEXT,
  organizer TEXT NOT NULL,
  place TEXT,
  lat REAL,
  lng REAL,
  remote BOOLEAN NOT NULL DEFAULT FALSE,
  when_text TEXT,
  starts_on DATE,
  how TEXT NOT NULL,
  url TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  times TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS give_opportunities_open ON {s}.give_opportunities (status, created_at DESC);

CREATE TABLE IF NOT EXISTS {s}.give_saves (
  user_id TEXT NOT NULL,
  opportunity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS {s}.give_waves (
  id UUID PRIMARY KEY,
  connection_id UUID NOT NULL,
  opportunity_id UUID NOT NULL,
  proposed_by TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS give_waves_live ON {s}.give_waves (connection_id, opportunity_id) WHERE status IN ('proposed', 'active');

CREATE TABLE IF NOT EXISTS {s}.give_wave_events (
  id UUID PRIMARY KEY,
  wave_id UUID NOT NULL,
  actor TEXT,
  kind TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS give_wave_events_wave ON {s}.give_wave_events (wave_id, created_at);

CREATE TABLE IF NOT EXISTS {s}.give_sessions (
  id UUID PRIMARY KEY,
  wave_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  day DATE NOT NULL,
  hours REAL NOT NULL,
  together BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wave_id, user_id, day)
);

CREATE TABLE IF NOT EXISTS {s}.give_gratus (
  id UUID PRIMARY KEY,
  wave_id UUID NOT NULL,
  day DATE NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  message TEXT,
  point BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wave_id, day, from_user)
);

CREATE TABLE IF NOT EXISTS {s}.give_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
