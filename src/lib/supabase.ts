import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CostRule = {
  id: string;
  variant_label: string;
  cost: number;
  created_at: string;
  updated_at: string;
};

export type UploadHistory = {
  id: string;
  platform: string;
  filename: string;
  row_count: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  upload_id: string;
  platform: string;
  order_id: string;
  order_status: string;
  product_name: string;
  sku: string;
  variation: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  detected_variant: string;
  unit_cost: number;
  total_cost: number;
  profit: number;
  created_at: string;
};
