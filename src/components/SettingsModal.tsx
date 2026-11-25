import { useRef, useState } from "react";
import { Download, Github, ShieldCheck, Upload, X } from "lucide-react";
import type { PanelSettings, VenueDesignPreset } from "../types";
import { VENUE_DESIGN_OPTIONS } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  settings: PanelSettings;
  onSave: (next: PanelSettings) => void;
  onExportBackup: () => void;
  onImportFile: (file: File) => void;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  onSave,
  onExportBackup,
  onImportFile,
  onClose,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<PanelSettings>(settings);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface-card rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-[#D4A853]" />
            <h2 className="font-display text-base font-semibold text-white">
              Panel Ayarları &amp; GitHub Scraper Bağlantısı
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              GitHub Token (Opsiyonel — Panelden tek tıkla gosom/SerpAPI taraması başlatır)
            </label>
            <input
              type="password"
              value={draft.githubToken}
              onChange={(e) => setDraft({ ...draft, githubToken: e.target.value })}
              placeholder="github_pat_... (Actions: Read & Write)"
              className="input-dark w-full rounded-lg px-3.5 py-2.5 text-sm font-mono-num"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Token girmeden de &quot;GitHub&apos;da Çalıştır&quot; butonuyla tarama başlatıp
              &quot;Listeyi Yenile&quot; diyerek tüm gerçek işletmeleri çekebilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Mesajda Gönderilecek Web Sitesi
              </label>
              <input
                type="url"
                value={draft.siteUrl}
                onChange={(e) => setDraft({ ...draft, siteUrl: e.target.value })}
                placeholder="https://likyastudios.live/isletmeler"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Gönderici Adı
              </label>
              <input
                type="text"
                value={draft.senderName}
                onChange={(e) => setDraft({ ...draft, senderName: e.target.value })}
                placeholder="Açelya"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Kendi WhatsApp Numaranız (İmza &amp; Görsellerde Görünür)
            </label>
            <input
              type="tel"
              value={draft.senderPhone}
              onChange={(e) => setDraft({ ...draft, senderPhone: e.target.value })}
              placeholder="+90 545 776 05 57"
              className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Varsayılan Mekan Tasarım Seçimi
            </label>
            <select
              value={draft.defaultPreset}
              onChange={(e) =>
                setDraft({ ...draft, defaultPreset: e.target.value as VenueDesignPreset })
              }
              className="input-dark w-full rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="auto">Otomatik (Sektör ve Mekana Göre Uyarla — Önerilen)</option>
              {VENUE_DESIGN_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.vibe}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ekip PIN Kilidi (sadece biz erişelim)</span>
              </label>
              <input
                type="checkbox"
                checked={draft.pinEnabled}
                onChange={(e) => setDraft({ ...draft, pinEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#D4A853]"
              />
            </div>
            {draft.pinEnabled && (
              <input
                type="text"
                value={draft.panelPin}
                onChange={(e) => setDraft({ ...draft, panelPin: e.target.value })}
                placeholder="Ekip PIN (örn: 2026)"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono-num"
              />
            )}
          </div>

          <div className="pt-3 border-t border-white/10">
            <p className="text-xs font-medium text-zinc-300 mb-2">
              GitHub Scraper Dosyası Yükle (gosom / Mahanaicoach / omkarcloud)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>CSV / JSONL / JSON</span>
              </button>
              <button
                type="button"
                onClick={onExportBackup}
                className="px-3 py-2.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Yedeği İndir (.json)</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.jsonl,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              Vazgeç
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg text-sm btn-gold">
              Ayarları Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
