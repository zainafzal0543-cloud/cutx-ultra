-- ─────────────────────────────────────────────
-- CUTX ULTRA — Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Projects ────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{
    "unit": "mm",
    "bladeKerf": 3.2,
    "allowRotation": true,
    "optimizationAlgorithm": "guillotine",
    "padding": 0
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sheets ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sheet 1',
  material TEXT NOT NULL DEFAULT 'plywood',
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  thickness NUMERIC NOT NULL DEFAULT 18,
  quantity INTEGER NOT NULL DEFAULT 1,
  cost_per_sheet NUMERIC,
  grain_direction TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cutting Items ────────────────────────────
CREATE TABLE IF NOT EXISTS cutting_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  allow_rotation BOOLEAN DEFAULT TRUE,
  section_tag TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Optimization Results ─────────────────────
CREATE TABLE IF NOT EXISTS optimization_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'guillotine',
  total_sheets INTEGER NOT NULL DEFAULT 0,
  total_used_area NUMERIC NOT NULL DEFAULT 0,
  total_waste_area NUMERIC NOT NULL DEFAULT 0,
  overall_efficiency NUMERIC NOT NULL DEFAULT 0,
  processing_time_ms NUMERIC DEFAULT 0,
  result_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheets_project_id ON sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_cutting_items_project_id ON cutting_items(project_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_project_id ON optimization_results(project_id);

-- ─── Auto-update updated_at ───────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ───────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Sheets policies (via project ownership)
CREATE POLICY "Users can manage sheets of own projects"
  ON sheets FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Cutting items policies
CREATE POLICY "Users can manage cutting items of own projects"
  ON cutting_items FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Optimization results policies
CREATE POLICY "Users can manage optimization results of own projects"
  ON optimization_results FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
