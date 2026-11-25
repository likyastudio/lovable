import { Copy, Download, Palette, RotateCcw, X } from "lucide-react";
import type { VenueDesignPreset } from "../types";
import { VENUE_DESIGN_OPTIONS } from "../types";

interface ImageModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  dataUrl: string;
  preset: Exclude<VenueDesignPreset, "auto">;
  accentColor?: string;
  onChangePreset: (next: Exclude<VenueDesignPreset, "auto">) => void;
  onChangeAccent: (hex: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function ImageModal({
  isOpen,
  title,
  subtitle,
  dataUrl,
  preset,
  accentColor,
  onChangePreset,
  onChangeAccent,
  onCopy,
  onDownload,
  onClose,
}: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface-card rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-semibold text-white truncate">
              {title}
            </h2>
            <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#06080B] p-4 flex items-center justify-center max-h-[62vh] overflow-auto">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={title}
              className="max-h-[58vh] w-auto rounded-xl border border-white/10 object-contain shadow-2xl"
            />
          ) : (
            <div className="py-16 text-xs text-zinc-500">Görsel oluşturuluyor...</div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-white/10 space-y-3">
          {/* 6 Venue Design Style Picker */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1 mr-1">
              <Palette className="w-3.5 h-3.5" />
              Mekan Stili:
            </span>
            {VENUE_DESIGN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangePreset(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs border inline-flex items-center gap-1.5 transition ${
                  preset === opt.id
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <span>Vurgu Rengi:</span>
                <input
                  type="color"
                  value={accentColor || "#D4A853"}
                  onChange={(e) => onChangeAccent(e.target.value)}
                  className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                />
              </label>
              {accentColor && (
                <button
                  type="button"
                  onClick={() => onChangeAccent("")}
                  className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Varsayılan</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="px-3.5 py-2 rounded-lg text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-white font-medium inline-flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Panoya Kopyala</span>
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm btn-gold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG İndir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
