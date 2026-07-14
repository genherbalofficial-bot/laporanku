import * as XLSX from 'xlsx';
import type { ParsedOrderItem } from './excelParser';

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function exportToExcel(items: ParsedOrderItem[], filename: string) {
  const data = items.map((item) => ({
    'Platform': item.platform.toUpperCase(),
    'No. Pesanan': item.order_id,
    'Status': item.order_status,
    'Nama Produk': item.product_name,
    'SKU': item.sku,
    'Variasi': item.variation,
    'Varian Terdeteksi': item.detected_variant,
    'Qty': item.quantity,
    'Harga Jual/Unit': item.unit_price,
    'Total Harga Jual': item.total_price,
    'Modal/Unit': item.unit_cost,
    'Total Modal': item.total_cost,
    'Laba': item.profit,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  XLSX.writeFile(wb, filename);
}
