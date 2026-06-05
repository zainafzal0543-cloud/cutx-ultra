# CUTX ULTRA — Production Deployment Guide

> Complete enterprise deployment for Vercel + Supabase.

---

## 1. Pre-Deployment Checklist

```
[ ] Supabase project created (production tier)
[ ] All 3 schema files executed in order
[ ] Environment variables configured
[ ] Domain purchased and configured
[ ] Storage buckets created
[ ] RLS policies verified
[ ] PWA icons generated (all sizes)
[ ] next.config.js production settings confirmed
```

---

## 2. Supabase Production Setup

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose **Pro plan** (required for production — includes PITR backups)
3. Select region closest to your users
4. Set a strong database password — store it securely

### 2.2 Run Database Migrations (in order)

In **SQL Editor**, run each file in order:

```sql
-- Step 1: Phase 1 base schema
-- Contents of: supabase/schema.sql

-- Step 2: Phase 2 additions
-- Contents of: supabase/schema-phase2.sql

-- Step 3: Phase 3 enterprise schema
-- Contents of: supabase/schema-phase3.sql
```

### 2.3 Create Storage Buckets

In **Storage** → New Bucket:

| Bucket | Public | Purpose |
|---|---|---|
| `project-exports` | No | PDF/DXF/PNG exports |
| `label-prints` | No | QR label sheets |
| `org-logos` | Yes | Organization logos |

Storage policies (run in SQL Editor):
```sql
CREATE POLICY "Auth users access own exports"
ON storage.objects FOR ALL
USING (bucket_id = 'project-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public org logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');
```

### 2.4 Configure Auth

Go to **Authentication → Settings**:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/**`
- Email confirmations: **Enabled**
- JWT expiry: `3600` (1 hour)

Enable providers:
- Email/Password ✓
- Google (optional)
- GitHub (optional)

### 2.5 Enable Extensions

In SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

---

## 3. Vercel Deployment

### 3.1 Repository Setup

```bash
# Initialize git
git init
git add .
git commit -m "CUTX ULTRA — Production Ready"

# Push to GitHub
git remote add origin https://github.com/yourorg/cutx-ultra.git
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `.next`

### 3.3 Environment Variables

Set all of these in **Vercel → Settings → Environment Variables**:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=CUTX ULTRA

# Features
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true
NEXT_PUBLIC_ENABLE_AI_OPTIMIZE=false    # Set true when AI API ready

# Optional: AI API (Phase 4 prep)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
```

Set **all three environments**: Production, Preview, Development.

### 3.4 Domain Setup

1. Vercel → Settings → Domains → Add `cutxultra.com`
2. Add DNS records at your registrar:
   ```
   A     @    76.76.21.21
   CNAME www  cname.vercel-dns.com
   ```
3. SSL auto-provisioned by Vercel (Let's Encrypt)

---

## 4. Performance Optimization

### 4.1 Next.js Config

The `next.config.js` already includes:
- PWA caching with `next-pwa`
- Package import optimization
- Image optimization

Add these for production:
```js
// next.config.js additions
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion', 'konva'],
  },
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }],
};
```

### 4.2 Supabase Performance

Enable in Supabase dashboard:
- **Connection Pooling** (PgBouncer) — Transaction mode, pool size 15
- **Read Replicas** (Pro plan) — for analytics queries

Add indexes for common queries:
```sql
-- Frequently filtered
CREATE INDEX CONCURRENTLY idx_projects_user_updated
  ON projects(user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_cutting_items_project
  ON cutting_items(project_id, created_at);

CREATE INDEX CONCURRENTLY idx_inventory_org_material
  ON inventory_sheets(org_id, material, quantity);

-- Full text search on project names
CREATE INDEX idx_projects_name_fts
  ON projects USING gin(to_tsvector('english', name));
```

---

## 5. Security Hardening

### 5.1 Supabase RLS Audit

Verify all RLS policies are active:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Every table should show rowsecurity = true
```

### 5.2 API Rate Limiting

In Supabase → Settings → API:
- Set **Rate Limiting**: 100 requests/minute per IP (anonymous)
- Set **Rate Limiting**: 1000 requests/minute per authenticated user

### 5.3 Environment Security

- Never commit `.env.local` to git (already in `.gitignore`)
- Rotate Supabase service role key every 90 days
- Use Vercel's encrypted env vars for all secrets
- Enable Supabase **Audit Logs** (Enterprise plan)

### 5.4 Content Security Policy

Add to `next.config.js` headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' *.supabase.co wss://*.supabase.co;
```

---

## 6. Backup Strategy

### 6.1 Supabase Automated Backups

Pro plan includes:
- **Daily backups** retained for 7 days
- **Point-in-time recovery** (PITR) — restore to any second

Enable PITR in Settings → Database → Backups.

### 6.2 Manual Export

Weekly manual export as extra safety:
```bash
# Using supabase CLI
supabase db dump --db-url "postgresql://..." > backup-$(date +%Y%m%d).sql
```

### 6.3 Local Data Export

Users can export their data anytime:
- **Project JSON** export (full backup)
- **CSV export** for cutting lists

---

## 7. Monitoring

### 7.1 Vercel Analytics

Enable in Vercel → Analytics:
- Core Web Vitals tracking
- Real User Monitoring (RUM)

### 7.2 Supabase Monitoring

Dashboard → Reports:
- API request volume
- Database query performance
- Auth success/failure rates

### 7.3 Error Tracking (recommended)

Add Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## 8. Scaling Architecture

### 8.1 Current Architecture (Phase 3)

```
User Browser
    │
    ▼
Vercel CDN (Edge Network)
    │
    ├── Static Assets (CDN cached)
    ├── Next.js App (Serverless Functions)
    │
    ▼
Supabase
    ├── PostgreSQL (primary + read replica)
    ├── Auth (JWT)
    ├── Storage (S3-compatible)
    └── Realtime (WebSocket)
```

### 8.2 Scaling Thresholds

| Load | Action |
|---|---|
| < 1,000 users | Current setup sufficient |
| 1,000–10,000 | Enable Supabase Pro + connection pooling |
| 10,000–100,000 | Add Supabase read replica + Vercel Team plan |
| 100,000+ | Supabase Enterprise + dedicated compute |

### 8.3 Future API Architecture (Phase 4 prep)

```
/api/optimize     → Edge Function (fast, global)
/api/ai/analyze  → Serverless (calls Claude/OpenAI)
/api/cnc/gcode   → Serverless (CPU-intensive)
/api/export/pdf  → Serverless with Puppeteer
/api/sync        → Supabase Realtime
```

---

## 9. PWA Configuration

### 9.1 Generate Icons

Use [pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator) with `public/icons/icon.svg`.

Place generated icons in `public/icons/`:
```
icon-72x72.png, icon-96x96.png, icon-128x128.png
icon-144x144.png, icon-152x152.png, icon-192x192.png
icon-384x384.png, icon-512x512.png, apple-touch-icon.png
```

### 9.2 Verify PWA

After deployment:
1. Open Chrome DevTools → Application → Manifest
2. Run Lighthouse → PWA audit (target 100)
3. Test "Add to Home Screen" on mobile

---

## 10. Launch Checklist

```
[ ] All environment variables set in Vercel
[ ] Database migrations run (all 3 phases)
[ ] Storage buckets created with correct policies
[ ] RLS enabled on all tables (verified)
[ ] Domain configured with SSL
[ ] PWA icons generated
[ ] Onboarding tested end-to-end
[ ] Export tested (CSV, DXF, PNG)
[ ] Optimization engine tested with 500+ parts
[ ] Mobile layout tested on iOS + Android
[ ] Lighthouse score > 90 on all metrics
[ ] Error boundaries added to key components
[ ] Backup strategy configured
[ ] Analytics enabled
```

---

## 11. Production Optimization Checklist

### Performance
- [ ] `next build` produces no TypeScript errors
- [ ] Bundle size analyzed (`npm run build` output)
- [ ] Konva imported dynamically (SSR disabled)
- [ ] Images use `next/image` where applicable
- [ ] Heavy components lazy-loaded with `dynamic()`

### SEO & Accessibility
- [ ] `<html lang="en">` set
- [ ] All interactive elements have `aria-label`
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Keyboard navigation works end-to-end
- [ ] Focus indicators visible

### Security
- [ ] No secrets in client-side code
- [ ] Supabase service role key only in server routes
- [ ] Input validation on all forms
- [ ] File upload types restricted
- [ ] Rate limiting configured

---

*CUTX ULTRA — Phase 3 complete. Enterprise-grade industrial cutting optimizer.*
*Phases 1–3 deliver: 11,000+ lines of production TypeScript across 65+ files.*
