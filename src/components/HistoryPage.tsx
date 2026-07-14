import { useEffect, useState } from 'react';
import { History, Trash2, Loader2, ChevronRight, TrendingUp, Wallet, Package } from 'lucide-react';
import { supabase, type UploadHistory, type OrderItem } from '../lib/supabase';
import { formatRupiah, formatNumber, formatDate } from '../lib/format';

export default function HistoryPage() {
  const [uploads, setUploads] = useState<UploadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<UploadHistory | null>(null);

  const fetchUploads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('upload_history')
      .select('*')
      .order('created_at', { ascending: false });
    setUploads((data as UploadHistory[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleSelect = async (upload: UploadHistory) => {
    setSelectedUpload(upload);
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('upload_id', upload.id)
      .order('created_at', { ascending: false });
    setSelectedItems((data as OrderItem[]) || []);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('upload_history').delete().eq('id', id);
    if (selectedUpload?.id === id) {
      setSelectedUpload(null);
      setSelectedItems([]);
    }
    await fetchUploads();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Riwayat Upload</h2>
        <p className="mt-1 text-sm text-slate-500">
          Semua laporan yang pernah diupload beserta ringkasannya.
        </p>
      </div>

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <History className="h-12 w-12 text-slate-300" />
          <p className="text-sm text-slate-400">Belum ada riwayat upload.</p>
        </div>
      ) : (
        <>
          {/* Upload list */}
          <div className="space-y-3">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className={`rounded-xl border bg-white p-4 transition cursor-pointer ${
                  selectedUpload?.id === upload.id
                    ? 'border-blue-400 ring-1 ring-blue-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSelect(upload)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      upload.platform === 'shopee' ? 'bg-orange-100' : 'bg-slate-100'
                    }`}>
                      <Package className={`h-5 w-5 ${
                        upload.platform === 'shopee' ? 'text-orange-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{upload.filename}</p>
                      <p className="text-xs text-slate-400">
                        {upload.platform.toUpperCase()} • {formatDate(upload.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{formatNumber(upload.row_count)} item</p>
                      <p className={`text-sm font-semibold ${
                        upload.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Laba: {formatRupiah(upload.total_profit)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(upload.id);
                      }}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected upload detail */}
          {selectedUpload && selectedItems.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Pendapatan</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-emerald-700">
                    {formatRupiah(selectedUpload.total_revenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Total Modal</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-amber-700">
                    {formatRupiah(selectedUpload.total_cost)}
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${
                  selectedUpload.total_profit >= 0
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${
                      selectedUpload.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`text-xs font-medium ${
                      selectedUpload.total_profit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>Laba Bersih</span>
                  </div>
                  <p className={`mt-2 text-lg font-bold ${
                    selectedUpload.total_profit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatRupiah(selectedUpload.total_profit)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Rincian ({selectedItems.length} item)
                  </h3>
                </div>
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
                      {selectedItems.slice(0, 100).map((item) => (
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
