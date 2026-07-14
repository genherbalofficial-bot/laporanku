import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Tag, Loader2, AlertCircle } from 'lucide-react';
import { supabase, type CostRule } from '../lib/supabase';
import { formatRupiah } from '../lib/format';

export default function SettingsPage() {
  const [rules, setRules] = useState<CostRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newCost, setNewCost] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cost_rules')
      .select('*')
      .order('variant_label', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setRules((data as CostRule[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAdd = async () => {
    const label = newLabel.trim().toLowerCase().replace(/\s+/g, '');
    const cost = parseFloat(newCost);
    if (!label || isNaN(cost) || cost < 0) {
      setError('Isi label varian dan harga modal dengan benar');
      return;
    }
    setError(null);
    setSaving(true);
    const { error } = await supabase
      .from('cost_rules')
      .insert({ variant_label: label, cost })
      .select()
      .single();
    if (error) {
      setError(error.message);
    } else {
      setNewLabel('');
      setNewCost('');
      await fetchRules();
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string, cost: number) => {
    const { error } = await supabase
      .from('cost_rules')
      .update({ cost, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      await fetchRules();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('cost_rules').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      await fetchRules();
    }
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
        <h2 className="text-lg font-semibold text-slate-800">Pengaturan Harga Modal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Atur harga modal (harga beli) untuk setiap varian produk. Software akan otomatis
          mendeteksi varian dari laporan dan mengisi modalnya.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Add New Rule */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Plus className="h-4 w-4" />
          Tambah Varian Baru
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Label Varian (mis. 15ml, 30ml, 60ml)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="contoh: 100ml"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Harga Modal (Rp)
            </label>
            <input
              type="number"
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="contoh: 25000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tambah
          </button>
        </div>
      </div>

      {/* Existing Rules */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Tag className="h-4 w-4" />
            Daftar Varian & Modal ({rules.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Belum ada varian. Tambahkan varian di atas.
            </p>
          ) : (
            rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-800">Cara Kerja Deteksi Varian</h4>
        <ol className="mt-2 space-y-1 text-sm text-blue-700">
          <li>1. Software mencari pola volume (mis. "15ml", "30 ml", "60ML") di kolom <strong>Variasi</strong></li>
          <li>2. Jika tidak ada, coba di kolom <strong>SKU</strong></li>
          <li>3. Jika masih tidak ada, coba di <strong>Nama Produk</strong></li>
          <li>4. Jika tidak ada volume sama sekali, default ke <strong>30ml</strong></li>
        </ol>
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: CostRule;
  onUpdate: (id: string, cost: number) => void;
  onDelete: (id: string) => void;
}) {
  const [editCost, setEditCost] = useState(String(rule.cost));
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    const cost = parseFloat(editCost);
    if (!isNaN(cost) && cost >= 0) {
      onUpdate(rule.id, cost);
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="inline-block min-w-[70px] rounded-full bg-blue-100 px-3 py-1 text-center text-sm font-semibold text-blue-700">
        {rule.variant_label}
      </span>
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <span className="text-sm text-slate-400">Rp</span>
          <input
            type="number"
            value={editCost}
            onChange={(e) => setEditCost(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
          >
            <Save className="h-3.5 w-3.5" />
            Simpan
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {formatRupiah(rule.cost)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditCost(String(rule.cost));
                setEditing(true);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
