-- ─────────────────────────────────────────────
-- CUTX ULTRA Phase 3 — Enterprise Schema
-- Run AFTER phase 1 and phase 2 schemas
-- ─────────────────────────────────────────────

-- ─── Organizations ────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  logo_url TEXT,
  settings JSONB DEFAULT '{"defaultCurrency":"USD","defaultUnit":"mm","timezone":"UTC","allowClientSharing":true,"requireApprovalForExport":false,"maxTeamMembers":5}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Team Members ─────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'operator',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_team_org ON team_members(org_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON team_members(user_id);

-- ─── Inventory ────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  material TEXT NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  thickness NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mm',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 5,
  cost_per_sheet NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  supplier_id UUID,
  supplier_sku TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID REFERENCES inventory_sheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  lead_time_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quotations ───────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 10,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'none',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  profit_margin_percent NUMERIC NOT NULL DEFAULT 25,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CNC Profiles ─────────────────────────────
CREATE TABLE IF NOT EXISTS cnc_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  tool_diameter NUMERIC NOT NULL,
  kerf NUMERIC NOT NULL,
  feed_rate NUMERIC NOT NULL,
  plunge_rate NUMERIC NOT NULL,
  pass_depth NUMERIC NOT NULL,
  spindle_speed INTEGER,
  lead_in NUMERIC DEFAULT 5,
  lead_out NUMERIC DEFAULT 5,
  tab_width NUMERIC,
  tab_height NUMERIC,
  tab_spacing NUMERIC,
  units TEXT DEFAULT 'mm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Piece Labels / QR tracking ───────────────
CREATE TABLE IF NOT EXISTS piece_labels (
  piece_id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  part_label TEXT NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  thickness NUMERIC,
  material TEXT,
  sheet_number INTEGER NOT NULL,
  position_x NUMERIC,
  position_y NUMERIC,
  rotated BOOLEAN DEFAULT FALSE,
  qr_data TEXT,
  barcode_data TEXT,
  cut_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id TEXT REFERENCES piece_labels(piece_id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  notes TEXT,
  device_info TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Activity Log ─────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ─── Auto-update triggers ─────────────────────
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ───────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE piece_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cnc_profiles ENABLE ROW LEVEL SECURITY;

-- Organizations: users see their own org
CREATE POLICY "Members see own org" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid()));

-- Team members: see members of same org
CREATE POLICY "See team in same org" ON team_members FOR SELECT
  USING (org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners manage team" ON team_members FOR ALL
  USING (org_id IN (
    SELECT org_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','super_admin')
  ));

-- Inventory: org members
CREATE POLICY "Org members access inventory" ON inventory_sheets FOR ALL
  USING (user_id = auth.uid() OR org_id IN (
    SELECT org_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Quotations: project owners
CREATE POLICY "Users manage own quotations" ON quotations FOR ALL
  USING (user_id = auth.uid());

-- Piece labels: project owners
CREATE POLICY "Users manage own labels" ON piece_labels FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Activity log: org members read, system writes
CREATE POLICY "Org members read activity" ON activity_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM team_members WHERE user_id = auth.uid()));

-- ─── Storage Buckets (run in Supabase dashboard) ─
-- create bucket 'project-exports' (private)
-- create bucket 'label-prints' (private)
-- create bucket 'org-logos' (public)
