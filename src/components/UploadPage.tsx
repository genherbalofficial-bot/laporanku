import { useCallback, useRef, useState } from 'react';
import {
  UploadCloud,
  TrendingUp,
  Wallet,
  Package,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Table,
} from 'lucide-react';
import { supabase, type CostRule, type OrderItem } from '../lib/supabase';
import { parseExcelFile, applyCostRules, type ParsedOrderItem } from '../lib/excelParser';
import { formatRupiah, formatNumber, exportToExcel } from '../lib/format';

type Props = {
  costRules: CostRule[];
};

type SavedUpload = {
  uploadId: string;
  items: ParsedOrderItem[];
};

export default function UploadPage({ costRules }: Props) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SavedUpload | null>(null);
  const [savedHistory, setSavedHistory] = useState<OrderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.match(/\.xlsx?$/i)) {
        setError('File harus berformat Excel (.xlsx atau .xls)');
        return;
      }

      setError(null);
      setParsing(true);
      setResult(null);
      setSavedHistory([]);

      try {
        const parsed = await parseExcelFile(file);
        if (parsed.items.length === 0) {
          setError('Tidak ada data ditemukan di file ini.');
          setParsing(false);
          return;
        }

        const itemsWithCost = applyCostRules(parsed.items, costRules);

        setParsing(false);
        setSaving(true);

        // Save to Supabase
        const { data: uploadData, error: uploadError } = await supabase
          .from('upload_history')
          .insert({
            platform: parsed.platform,
            filename: file.name,
            row_count: itemsWithCost.length,
            total_revenue: parsed.totalRevenue,
            total_cost: parsed.totalCost,
            total_profit: parsed.totalProfit,
          })
          .select()
          .single();

        if (uploadError) throw uploadError;

        const { error: itemsError } = await supabase.from('order_items').insert(
          itemsWithCost.map((item) => ({
            upload_id: uploadData.id,
            platform: item.platform,
            order_id: item.order_id,
            order_status: item.order_status,
            product_name: item.product_name,
            sku: item.sku,
            variation: item.variation,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            detected_variant: item.detected_variant,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost,
            profit: item.profit,
          })),
        );

        if (itemsError) throw itemsError;

        setSaving(false);
        setResult({ uploadId: uploadData.id, items: itemsWithCost });
      } catch (err) {
        setParsing(false);
        setSaving(false);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses file');
      }
    },
    [costRules],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const loadHistory = async (uploadId: string) => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('upload_id', uploadId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setSavedHistory(data as OrderItem[]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {parsing || saving ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-600 font-medium">
              {parsing ? 'Memproses file Excel...' : 'Menyimpan ke database...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <UploadCloud className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">
                Tarik & lepas file Excel di sini
              </p>
              <p className="mt-1 text-sm text-slate-500">
                atau klik untuk memilih file. Mendukung laporan Shopee & TikTok (.xlsx)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {result && (
        <>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">
              Berhasil! {result.items.length} item dari {result.items[0]?.platform.toUpperCase()} sudah diproses.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<Package className="h-5 w-5" />}
              label="Total Item"
              value={formatNumber(result.items.length)}
              color="blue"
            />
            <SummaryCard
              icon={<Wallet className="h-5 w-5" />}
              label="Total Pendapatan"
              value={formatRupiah(result.items.reduce((s, i) => s + i.total_price, 0))}
              color="emerald"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Modal"
              value={formatRupiah(result.items.reduce((s, i) => s + i.total_cost, 0))}
              color="amber"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Laba"
              value={formatRupiah(result.items.reduce((s, i) => s + i.profit, 0))}
              color={result.items.reduce((s, i) => s + i.profit, 0) >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                exportToExcel(result.items, `hasil-modal-${Date.now()}.xlsx`)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={() => loadHistory(result.uploadId)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Table className="h-4 w-4" />
              Muat dari Database
            </button>
          </div>

          {/* Results Table */}
          <ResultsTable items={result.items} />
        </>
      )}

      {/* Saved History Table */}
      {savedHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Data dari Database ({savedHistory.length} item)
          </h3>
          <SavedTable items={savedHistory} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'emerald' | 'amber' | 'green' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function ResultsTable({ items }: { items: ParsedOrderItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? items : items.slice(0, 50);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Rincian Pesanan ({items.length} item)
        </h3>
        {items.length > 50 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {showAll ? 'Tampilkan 50' : `Tampilkan semua (${items.length})`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">No. Pesanan</th>
              <th className="px-3 py-2.5 font-medium">Produk</th>
              <th className="px-3 py-2.5 font-medium">SKU</th>
              <th className="px-3 py-2.5 font-medium">Variasi</th>
              <th className="px-3 py-2.5 text-center font-medium">Varian</th>
              <th className="px-3 py-2.5 text-center font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Harga Jual</th>
              <th className="px-3 py-2.5 text-right font-medium">Modal/Unit</th>
              <th className="px-3 py-2.5 text-right font-medium">Total Modal</th>
              <th className="px-3 py-2.5 text-right font-medium">Laba</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {display.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 text-xs text-slate-500">{item.order_id}</td>
                <td className="px-3 py-2.5 max-w-[200px] truncate text-slate-700" title={item.product_name}>
                  {item.product_name}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{item.sku}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{item.variation}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {item.detected_variant}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-600">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{formatRupiah(item.total_price)}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{formatRupiah(item.unit_cost)}</td>
                <td className="px-3 py-2.5 text-right font-medium text-amber-600">{formatRupiah(item.total_cost)}</td>
                <td className={`px-3 py-2.5 text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRupiah(item.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SavedTable({ items }: { items: OrderItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">No. Pesanan</th>
              <th className="px-3 py-2.5 font-medium">Produk</th>
              <th className="px-3 py-2.5 text-center font-medium">Varian</th>
              <th className="px-3 py-2.5 text-center font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Total Jual</th>
              <th className="px-3 py-2.5 text-right font-medium">Total Modal</th>
              <th className="px-3 py-2.5 text-right font-medium">Laba</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.slice(0, 50).map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 text-xs text-slate-500">{item.order_id}</td>
                <td className="px-3 py-2.5 max-w-[200px] truncate text-slate-700" title={item.product_name}>
                  {item.product_name}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {item.detected_variant}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-600">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{formatRupiah(item.total_price)}</td>
                <td className="px-3 py-2.5 text-right font-medium text-amber-600">{formatRupiah(item.total_cost)}</td>
                <td className={`px-3 py-2.5 text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRupiah(item.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
