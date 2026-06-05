-- ─────────────────────────────────────────────
-- CUTX ULTRA Phase 2 — Additional Schema
-- Run AFTER phase 1 schema.sql
-- ─────────────────────────────────────────────

-- ─── Remnants ────────────────────────────────
CREATE TABLE IF NOT EXISTS remnants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  sheet_id UUID,
  material TEXT NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  thickness NUMERIC NOT NULL DEFAULT 18,
  unit TEXT NOT NULL DEFAULT 'mm',
  area_mm2 NUMERIC NOT NULL,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  sheet_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_in_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remnants_material ON remnants(material);
CREATE INDEX IF NOT EXISTS idx_remnants_used ON remnants(used);
CREATE INDEX IF NOT EXISTS idx_remnants_area ON remnants(area_mm2 DESC);
CREATE INDEX IF NOT EXISTS idx_remnants_project ON remnants(project_id);

-- ─── Analytics Snapshots ─────────────────────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  efficiency NUMERIC NOT NULL,
  sheets_used INTEGER NOT NULL,
  waste_percent NUMERIC NOT NULL,
  total_pieces INTEGER NOT NULL,
  material TEXT,
  algorithm TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_project ON analytics_snapshots(project_id);

-- ─── Share Links ──────────────────────────────
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  read_only BOOLEAN DEFAULT TRUE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_project ON share_links(project_id);

-- ─── Export Jobs ──────────────────────────────
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_exports_project ON export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON export_jobs(status);

-- ─── Phase 2 Project Settings column ─────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS phase2_settings JSONB DEFAULT '{
    "optimizationMode": "minimum_wastage",
    "sortStrategy": "area_desc",
    "grainDirection": "none",
    "minRemnantSize": 100000,
    "autoSaveRemnants": true,
    "showCuttingOrder": false,
    "cuttingOrderStyle": "guillotine"
  }';

-- ─── RLS Policies ────────────────────────────

ALTER TABLE remnants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Remnants
CREATE POLICY "Users manage own remnants"
  ON remnants FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Analytics
CREATE POLICY "Users manage own analytics"
  ON analytics_snapshots FOR ALL
  USING (user_id = auth.uid());

-- Share links - owner can manage
CREATE POLICY "Users manage own share links"
  ON share_links FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Share links - anyone can read by token (for shared view)
CREATE POLICY "Anyone can read share links by token"
  ON share_links FOR SELECT
  USING (true);

-- Export jobs
CREATE POLICY "Users manage own export jobs"
  ON export_jobs FOR ALL
  USING (user_id = auth.uid());

-- ─── View: project summary ────────────────────
CREATE OR REPLACE VIEW project_summaries AS
SELECT
  p.id,
  p.name,
  p.updated_at,
  COUNT(DISTINCT ci.id) AS cutting_item_count,
  COUNT(DISTINCT r.id) AS remnant_count,
  COALESCE(
    (SELECT overall_efficiency FROM optimization_results
     WHERE project_id = p.id
     ORDER BY created_at DESC LIMIT 1),
    0
  ) AS latest_efficiency
FROM projects p
LEFT JOIN cutting_items ci ON ci.project_id = p.id
LEFT JOIN remnants r ON r.project_id = p.id AND r.used = false
GROUP BY p.id, p.name, p.updated_at;
