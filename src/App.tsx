import { useEffect, useState } from 'react';
import { Upload, Settings, History, FlaskConical } from 'lucide-react';
import { supabase, type CostRule } from './lib/supabase';
import UploadPage from './components/UploadPage';
import SettingsPage from './components/SettingsPage';
import HistoryPage from './components/HistoryPage';

type Tab = 'upload' | 'settings' | 'history';

function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [costRules, setCostRules] = useState<CostRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  const fetchCostRules = async () => {
    setRulesLoading(true);
    const { data } = await supabase
      .from('cost_rules')
      .select('*')
      .order('variant_label', { ascending: true });
    setCostRules((data as CostRule[]) || []);
    setRulesLoading(false);
  };

  useEffect(() => {
    fetchCostRules();
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: 'Upload Laporan', icon: <Upload className="h-4 w-4" /> },
    { id: 'history', label: 'Riwayat', icon: <History className="h-4 w-4" /> },
    { id: 'settings', label: 'Pengaturan Modal', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                <FlaskConical className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800">ModalCalc</h1>
                <p className="text-xs text-slate-400">Auto-fill Harga Modal Shopee & TikTok</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Nav */}
          <nav className="flex sm:hidden items-center gap-1 pb-2 -mt-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                  tab === t.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {rulesLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'upload' && <UploadPage costRules={costRules} />}
            {tab === 'history' && <HistoryPage />}
            {tab === 'settings' && (
              <SettingsWrapper onSaved={fetchCostRules}>
                <SettingsPage />
              </SettingsWrapper>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-4">
        <p className="text-center text-xs text-slate-400">
          ModalCalc — Otomatis isi harga modal dari laporan Shopee & TikTok
        </p>
      </footer>
    </div>
  );
}

function SettingsWrapper({ onSaved, children }: { onSaved: () => void; children: React.ReactNode }) {
  useEffect(() => {
    onSaved();
  }, []);
  return <>{children}</>;
}

export default App;
