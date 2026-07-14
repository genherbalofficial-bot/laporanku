import * as XLSX from 'xlsx';
import { detectVariant, getUnitCost } from './variantDetector';
import type { CostRule } from './supabase';

export type ParsedOrderItem = {
  platform: 'shopee' | 'tiktok';
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
};

export type ParseResult = {
  platform: 'shopee' | 'tiktok';
  items: ParsedOrderItem[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
};

/** Parse a number that may be stored as a string like "47.500" or "47,500". */
function parseNumber(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Parse quantity — always an integer. */
function parseQuantity(val: unknown): number {
  const n = parseNumber(val);
  return Math.max(1, Math.round(n));
}

/**
 * Detect platform from the worksheet headers.
 * Shopee has "No. Pesanan", TikTok has "Order ID".
 */
function detectPlatform(headers: string[]): 'shopee' | 'tiktok' {
  const joined = headers.join(' ').toLowerCase();
  if (joined.includes('no. pesanan') || joined.includes('nama produk')) {
    return 'shopee';
  }
  return 'tiktok';
}

/**
 * Find a column index by fuzzy-matching the header name.
 */
function findColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => (h || '').toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lower.findIndex((h) => h === candidate);
    if (idx !== -1) return idx;
  }
  // Partial match fallback
  for (const candidate of candidates) {
    const idx = lower.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as string[][];
        if (rows.length < 2) {
          resolve(emptyResult('shopee'));
          return;
        }

        const headers = (rows[0] || []).map((h) => String(h || '').trim());
        const platform = detectPlatform(headers);

        // Find the first real data row (skip description rows in TikTok)
        let dataStart = 1;
        if (platform === 'tiktok') {
          // TikTok row 1 is a description row; row 2 is the first real data
          if (rows[1] && String(rows[1]?.[0] || '').includes('Platform unique order ID')) {
            dataStart = 2;
          }
        }

        let items: ParsedOrderItem[] = [];
        if (platform === 'shopee') {
          items = parseShopeeRows(rows, headers, dataStart);
        } else {
          items = parseTikTokRows(rows, headers, dataStart);
        }

        const totalRevenue = items.reduce((s, i) => s + i.total_price, 0);
        const totalCost = items.reduce((s, i) => s + i.total_cost, 0);
        const totalProfit = totalRevenue - totalCost;

        resolve({
          platform,
          items,
          totalRevenue,
          totalCost,
          totalProfit,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function emptyResult(platform: 'shopee' | 'tiktok'): ParseResult {
  return { platform, items: [], totalRevenue: 0, totalCost: 0, totalProfit: 0 };
}

function parseShopeeRows(
  rows: string[][],
  headers: string[],
  dataStart: number,
): ParsedOrderItem[] {
  const col = {
    orderId: findColumn(headers, ['no. pesanan']),
    orderStatus: findColumn(headers, ['status pesanan']),
    productName: findColumn(headers, ['nama produk']),
    sku: findColumn(headers, ['nomor referensi sku', 'no. referensi sku']),
    variation: findColumn(headers, ['nama variasi']),
    quantity: findColumn(headers, ['jumlah']),
    unitPrice: findColumn(headers, ['harga setelah diskon']),
    totalPrice: findColumn(headers, ['subtotal pesanan']),
  };

  const items: ParsedOrderItem[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c)) continue;

    const productName = col.productName >= 0 ? String(row[col.productName] || '') : '';
    const sku = col.sku >= 0 ? String(row[col.sku] || '') : '';
    const variation = col.variation >= 0 ? String(row[col.variation] || '') : '';
    const quantity = col.quantity >= 0 ? parseQuantity(row[col.quantity]) : 1;
    const unitPrice = col.unitPrice >= 0 ? parseNumber(row[col.unitPrice]) : 0;
    const totalPrice = col.totalPrice >= 0 ? parseNumber(row[col.totalPrice]) : unitPrice * quantity;

    if (!productName && !sku && !variation) continue;

    items.push({
      platform: 'shopee',
      order_id: col.orderId >= 0 ? String(row[col.orderId] || '') : '',
      order_status: col.orderStatus >= 0 ? String(row[col.orderStatus] || '') : '',
      product_name: productName,
      sku,
      variation,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      detected_variant: '',
      unit_cost: 0,
      total_cost: 0,
      profit: 0,
    });
  }
  return items;
}

function parseTikTokRows(
  rows: string[][],
  headers: string[],
  dataStart: number,
): ParsedOrderItem[] {
  const col = {
    orderId: findColumn(headers, ['order id']),
    orderStatus: findColumn(headers, ['order status']),
    productName: findColumn(headers, ['product name']),
    sku: findColumn(headers, ['seller sku']),
    variation: findColumn(headers, ['variation']),
    quantity: findColumn(headers, ['quantity']),
    unitPrice: findColumn(headers, ['sku unit original price']),
    totalPrice: findColumn(headers, ['sku subtotal after discount']),
  };

  const items: ParsedOrderItem[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c)) continue;

    const productName = col.productName >= 0 ? String(row[col.productName] || '') : '';
    const sku = col.sku >= 0 ? String(row[col.sku] || '') : '';
    const variation = col.variation >= 0 ? String(row[col.variation] || '') : '';
    const quantity = col.quantity >= 0 ? parseQuantity(row[col.quantity]) : 1;
    const unitPrice = col.unitPrice >= 0 ? parseNumber(row[col.unitPrice]) : 0;
    const totalPrice = col.totalPrice >= 0 ? parseNumber(row[col.totalPrice]) : unitPrice * quantity;

    if (!productName && !sku && !variation) continue;

    items.push({
      platform: 'tiktok',
      order_id: col.orderId >= 0 ? String(row[col.orderId] || '') : '',
      order_status: col.orderStatus >= 0 ? String(row[col.orderStatus] || '') : '',
      product_name: productName,
      sku,
      variation,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      detected_variant: '',
      unit_cost: 0,
      total_cost: 0,
      profit: 0,
    });
  }
  return items;
}

/**
 * Fills in detected_variant, unit_cost, total_cost, and profit for each item.
 */
export function applyCostRules(items: ParsedOrderItem[], costRules: CostRule[]): ParsedOrderItem[] {
  return items.map((item) => {
    const detectedVariant = detectVariant(item.variation, item.sku, item.product_name);
    const unitCost = getUnitCost(detectedVariant, costRules);
    const totalCost = unitCost * item.quantity;
    const profit = item.total_price - totalCost;
    return {
      ...item,
      detected_variant: detectedVariant,
      unit_cost: unitCost,
      total_cost: totalCost,
      profit,
    };
  });
}
