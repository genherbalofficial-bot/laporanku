/*
# Create cost rules, upload history, and order items tables

## Overview
This migration creates the core schema for the COGS (cost of goods sold) auto-fill app.
The app lets a single user upload Shopee/TikTok order reports (Excel), automatically
detects the product variant (15ml, 30ml, 60ml, etc.) from SKU/variation/title fields,
looks up a user-configured cost rule, and fills in the modal (cost) per order line.

## New Tables

### cost_rules
- `id` (uuid, primary key)
- `variant_label` (text, unique) — the canonical variant label, e.g. "15ml", "30ml", "60ml"
- `cost` (numeric) — the modal/harga beli for this variant
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### upload_history
- `id` (uuid, primary key)
- `platform` (text) — "shopee" or "tiktok"
- `filename` (text) — original uploaded filename
- `row_count` (integer) — number of order line items parsed
- `total_revenue` (numeric) — sum of selling price
- `total_cost` (numeric) — sum of modal
- `total_profit` (numeric) — revenue - cost
- `created_at` (timestamptz)

### order_items
- `id` (uuid, primary key)
- `upload_id` (uuid, FK to upload_history)
- `platform` (text) — "shopee" or "tiktok"
- `order_id` (text) — order number from the report
- `order_status` (text)
- `product_name` (text)
- `sku` (text)
- `variation` (text)
- `quantity` (integer)
- `unit_price` (numeric) — selling price per unit
- `total_price` (numeric) — total selling price for this line
- `detected_variant` (text) — the variant detected by the matcher
- `unit_cost` (numeric) — modal per unit (from cost_rules)
- `total_cost` (numeric) — unit_cost * quantity
- `profit` (numeric) — total_price - total_cost
- `created_at` (timestamptz)

## Security
- Single-tenant app, no sign-in. RLS enabled on all tables.
- Policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared/public (no multi-user isolation needed).
*/

-- cost_rules: user-configured modal per variant
CREATE TABLE IF NOT EXISTS cost_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_label text UNIQUE NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cost_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cost_rules" ON cost_rules;
CREATE POLICY "anon_select_cost_rules" ON cost_rules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cost_rules" ON cost_rules;
CREATE POLICY "anon_insert_cost_rules" ON cost_rules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cost_rules" ON cost_rules;
CREATE POLICY "anon_update_cost_rules" ON cost_rules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cost_rules" ON cost_rules;
CREATE POLICY "anon_delete_cost_rules" ON cost_rules FOR DELETE
  TO anon, authenticated USING (true);

-- upload_history: metadata about each uploaded report
CREATE TABLE IF NOT EXISTS upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  filename text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_upload_history" ON upload_history;
CREATE POLICY "anon_select_upload_history" ON upload_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_upload_history" ON upload_history;
CREATE POLICY "anon_insert_upload_history" ON upload_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_upload_history" ON upload_history;
CREATE POLICY "anon_delete_upload_history" ON upload_history FOR DELETE
  TO anon, authenticated USING (true);

-- order_items: individual parsed order line items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE,
  platform text NOT NULL,
  order_id text,
  order_status text,
  product_name text,
  sku text,
  variation text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  detected_variant text,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_order_items_upload_id ON order_items(upload_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_created_at ON upload_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_rules_variant_label ON cost_rules(variant_label);

-- Seed default cost rules
INSERT INTO cost_rules (variant_label, cost) VALUES
  ('15ml', 15000),
  ('30ml', 25000),
  ('60ml', 40000)
ON CONFLICT (variant_label) DO NOTHING;
