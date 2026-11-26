import { useMemo, useRef, useState } from "react";
import {
  Camera,
  Copy,
  Download,
  ExternalLink,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  X,
} from "lucide-react";
import type { Lead, VenueDesignPreset } from "../types";
import { VENUE_DESIGN_OPTIONS } from "../types";
import { detectVenuePreset } from "../lib/leadParser";
import {
  downloadBusinessHtml,
  generateBusinessIndexHtml,
  openBusinessHtmlInNewTab,
} from "../lib/siteBuilder";
import {
  copyDataUrlToClipboard,
  downloadDataUrl,
  extractAccentColorFromImage,
  renderMobileMockupDataUrl,
} from "../lib/canvasGenerator";
import { slugify } from "../lib/phone";

interface SitePreviewModalProps {
  lead: Lead | null;
  defaultPreset: VenueDesignPreset;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
  onNotify: (msg: string, tone?: "default" | "success" | "error") => void;
  onClose: () => void;
}

export function SitePreviewModal({
  lead,
  defaultPreset,
  onUpdateLead,
  onNotify,
  onClose,
}: SitePreviewModalProps) {
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const photoRef = useRef<HTMLInputElement>(null);

  const activePreset: Exclude<VenueDesignPreset, "auto"> = useMemo(() => {
    if (!lead) return "aegean-tavern";
    return (
      lead.design_preset ||
      (defaultPreset !== "auto"
        ? defaultPreset
        : detectVenuePreset(lead.category, lead.business_name, lead.description))
    );
  }, [lead, defaultPreset]);

  const htmlDoc = useMemo(() => {
    if (!lead) return "";
    return generateBusinessIndexHtml(lead, activePreset);
  }, [lead, activePreset]);

  if (!lead) return null;

  async function handleCopyWhatsAppPreview() {
    if (!lead) return;
    const pngUrl = await renderMobileMockupDataUrl(lead, activePreset);
    const ok = await copyDataUrlToClipboard(pngUrl);
    if (ok) {
      onNotify("Site önizleme görseli panoya kopyalandı — WhatsApp'a yapıştırabilirsiniz", "success");
    } else {
      downloadDataUrl(pngUrl, `${slugify(lead.business_name)}_taslak.png`);
      onNotify("Önizleme görseli PNG olarak indirildi");
    }
  }

  function handlePhotoFile(file: File) {
    if (!lead) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      const extracted = await extractAccentColorFromImage(dataUrl);
      onUpdateLead(lead.id, {
        image_url: dataUrl,
        ...(extracted ? { accent_color: extracted } : {}),
      });
      onNotify(
        extracted
          ? `İşletme fotoğrafı eklendi ve renk tonu (${extracted}) siteye uyarlandı`
          : "İşletme fotoğrafı canlı siteye eklendi",
        "success"
      );
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface-card rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Studio Toolbar */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-white truncate">
                {lead.business_name} — Canlı Web Sitesi (`index.html`)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              {lead.district} · {lead.category} · TR/EN etkileşimli gerçek web sitesi taslağı
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Viewport Switch */}
            <div className="inline-flex rounded-lg border border-white/10 bg-[#090B0E] p-0.5">
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`px-2.5 py-1.5 rounded-md text-xs inline-flex items-center gap-1 transition ${
                  viewport === "mobile"
                    ? "bg-[#D4A853] text-[#090B0E] font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobil</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`px-2.5 py-1.5 rounded-md text-xs inline-flex items-center gap-1 transition ${
                  viewport === "desktop"
                    ? "bg-[#D4A853] text-[#090B0E] font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Masaüstü</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyWhatsAppPreview}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/15 text-white inline-flex items-center gap-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>WA Görseli Kopyala</span>
            </button>

            <button
              type="button"
              onClick={() => openBusinessHtmlInNewTab(htmlDoc)}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/15 text-white inline-flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Yeni Sekmede Aç</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadBusinessHtml(htmlDoc, `${slugify(lead.business_name)}-index.html`);
                onNotify("index.html dosyası indirildi", "success");
              }}
              className="btn-gold px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>index.html İndir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Style, Photo & Content Quick Customizer */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-white/10 bg-[#0D1117] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1 mr-1">
              <Palette className="w-3.5 h-3.5" />
              Mekan Stili:
            </span>
            {VENUE_DESIGN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateLead(lead.id, { design_preset: opt.id, accent_color: "" })
                }
                className={`px-2.5 py-1 rounded-lg text-xs border inline-flex items-center gap-1.5 transition ${
                  activePreset === opt.id
                    ? "border-[#D4A853] bg-[#D4A853]/15 text-white font-medium"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: opt.swatch }}
                />
                <span>{opt.shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <label className="inline-flex items-center gap-1.5 text-zinc-400 cursor-pointer">
              <span>Renk:</span>
              <input
                type="color"
                value={lead.accent_color || "#D4A853"}
                onChange={(e) => onUpdateLead(lead.id, { accent_color: e.target.value })}
                className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
              />
            </label>
            {lead.accent_color && (
              <button
                type="button"
                onClick={() => onUpdateLead(lead.id, { accent_color: "" })}
                className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition"
            >
              <Camera className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>{lead.image_url ? "Fotoğrafı Değiştir" : "Mekan Fotoğrafı Ekle"}</span>
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Live Interactive index.html iframe */}
        <div className="flex-1 bg-[#06080B] p-4 flex items-center justify-center overflow-auto">
          <div
            className={`h-full transition-all duration-200 bg-black rounded-2xl overflow-hidden border border-white/15 shadow-2xl ${
              viewport === "mobile" ? "w-[390px] max-w-full" : "w-full"
            }`}
          >
            <iframe
              title={`${lead.business_name} Canlı Web Sitesi`}
              srcDoc={htmlDoc}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
