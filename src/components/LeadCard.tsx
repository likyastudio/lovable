import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  QrCode,
  Star,
  Trash2,
} from "lucide-react";
import type { Lead, LeadStatus, MessageTemplateKey, VenueDesignPreset } from "../types";
import { VALID_STATUSES, VENUE_DESIGN_OPTIONS } from "../types";
import { detectVenuePreset } from "../lib/apify";
import {
  buildMessageForTemplate,
  formatDisplayPhone,
  isMobilePhone,
  slugify,
} from "../lib/phone";
import {
  copyDataUrlToClipboard,
  downloadDataUrl,
  extractAccentColorFromImage,
  renderMobileMockupDataUrl,
  renderQrCardDataUrl,
} from "../lib/canvasGenerator";

const STATUS_BADGE_STYLES: Record<LeadStatus, string> = {
  Yeni: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  "Görsel Hazır": "bg-[#D4A853]/15 text-[#E5BE6F] border-[#D4A853]/35",
  "Mesaj Atıldı": "bg-sky-400/15 text-sky-300 border-sky-400/30",
  Görüşülüyor: "bg-amber-400/15 text-amber-300 border-amber-400/35",
  "Satış Kapandı": "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
  İstemiyor: "bg-red-500/12 text-red-300 border-red-500/25",
};

interface LeadCardProps {
  lead: Lead;
  defaultPreset: VenueDesignPreset;
  siteUrl: string;
  senderName: string;
  senderPhone: string;
  onUpdate: (id: string, patch: Partial<Lead>) => void;
  onDelete: (id: string) => void;
  onOpenLightbox: (payload: {
    lead: Lead;
    kind: "mockup" | "qr";
    preset: Exclude<VenueDesignPreset, "auto">;
    dataUrl: string;
  }) => void;
  onNotify: (msg: string, tone?: "default" | "success" | "error") => void;
}

export function LeadCard({
  lead,
  defaultPreset,
  siteUrl,
  senderName,
  senderPhone,
  onUpdate,
  onDelete,
  onOpenLightbox,
  onNotify,
}: LeadCardProps) {
  const activePreset: Exclude<VenueDesignPreset, "auto"> =
    lead.design_preset ||
    (defaultPreset !== "auto"
      ? defaultPreset
      : detectVenuePreset(lead.category, lead.business_name, lead.description));

  const [mockupUrl, setMockupUrl] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [msgDraft, setMsgDraft] = useState<string>(lead.custom_message);
  const [notesDraft, setNotesDraft] = useState<string>(lead.notes);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMsgDraft(lead.custom_message);
  }, [lead.custom_message]);

  useEffect(() => {
    setNotesDraft(lead.notes);
  }, [lead.notes]);

  useEffect(() => {
    let active = true;
    Promise.all([
      renderMobileMockupDataUrl(lead, activePreset),
      renderQrCardDataUrl(lead, siteUrl, activePreset),
    ]).then(([mUrl, qUrl]) => {
      if (active) {
        setMockupUrl(mUrl);
        setQrUrl(qUrl);
      }
    });
    return () => {
      active = false;
    };
  }, [
    lead.business_name,
    lead.category,
    lead.district,
    lead.google_rating,
    lead.reviews_count,
    lead.address,
    lead.opening_hours,
    lead.image_url,
    lead.description,
    lead.highlights,
    lead.accent_color,
    activePreset,
    siteUrl,
  ]);

  const mobile = isMobilePhone(lead.phone);
  const statusStyle = STATUS_BADGE_STYLES[lead.status] || STATUS_BADGE_STYLES.Yeni;

  async function handlePhotoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      // Extract dominant venue color tone from the uploaded photo automatically
      const extractedHex = await extractAccentColorFromImage(dataUrl);
      onUpdate(lead.id, {
        image_url: dataUrl,
        ...(extractedHex ? { accent_color: extractedHex } : {}),
      });
      onNotify(
        extractedHex
          ? `Mekan fotoğrafı eklendi ve renk tonu (${extractedHex}) otomatik uyarlandı`
          : "Mekan fotoğrafı tasarıma eklendi",
        "success"
      );
    };
    reader.readAsDataURL(file);
  }

  async function handleCopyImage(dataUrl: string, label: string, suffix: string) {
    if (!dataUrl) return;
    const ok = await copyDataUrlToClipboard(dataUrl);
    if (ok) {
      onNotify(`${label} panoya kopyalandı — WhatsApp'ta yapıştırın`, "success");
    } else {
      downloadDataUrl(dataUrl, `${slugify(lead.business_name)}_${suffix}.png`);
      onNotify(`Tarayıcı pano engelledi; ${label} PNG olarak indirildi`, "default");
    }
  }

  async function handleCopyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(label, "success");
    } catch {
      onNotify("Pano erişimi engellendi", "error");
    }
  }

  function applyTemplate(tpl: MessageTemplateKey) {
    const nextMsg = buildMessageForTemplate(lead, tpl, siteUrl, senderName, senderPhone);
    setMsgDraft(nextMsg);
    onUpdate(lead.id, { custom_message: nextMsg });
    onNotify("Mesaj şablonu uygulandı");
  }

  function handleSendWhatsApp() {
    if (!lead.phone) {
      onNotify("Bu işletme için telefon numarası yok", "error");
      return;
    }
    const cleanMsg = msgDraft.trim();
    const url = `https://wa.me/${encodeURIComponent(lead.phone)}?text=${encodeURIComponent(cleanMsg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onUpdate(lead.id, {
      custom_message: cleanMsg,
      status: "Mesaj Atıldı",
    });
    onNotify('WhatsApp açıldı · Durum "Mesaj Atıldı" olarak güncellendi', "success");
  }

  return (
    <article className="surface-card rounded-2xl p-4 sm:p-5">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Col 1: Business Metadata, Status & Notes */}
        <div className="xl:col-span-4 flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-base sm:text-lg font-bold text-[#F4F0E6] leading-snug">
                  {lead.business_name}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  {lead.district && (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                      {lead.district}
                    </span>
                  )}
                  {lead.category && (
                    <span className="px-2 py-0.5 rounded-md bg-[#D4A853]/12 border border-[#D4A853]/30 text-[#E5BE6F]">
                      {lead.category}
                    </span>
                  )}
                  {lead.google_rating !== null && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/12 border border-amber-500/25 text-amber-300 font-mono-num inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {lead.google_rating.toFixed(1)} · {lead.reviews_count}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`"${lead.business_name}" kaydını silmek istiyor musunuz?`)) {
                    onDelete(lead.id);
                  }
                }}
                aria-label="İşletmeyi Sil"
                title="Kaydı Sil"
                className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`font-mono-num text-sm font-medium ${
                    mobile ? "text-emerald-300" : "text-zinc-300"
                  }`}
                >
                  {formatDisplayPhone(lead.phone)}
                </span>
                {lead.phone && (
                  <>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        mobile
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-zinc-700/50 text-zinc-400"
                      }`}
                    >
                      {mobile ? "Cep (WA)" : "Sabit"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(lead.phone, "Telefon numarası kopyalandı")}
                      className="text-zinc-500 hover:text-white underline"
                    >
                      kopyala
                    </button>
                  </>
                )}
              </div>
              {lead.description && (
                <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">
                  {lead.description}
                </p>
              )}
              {lead.address && <p className="text-zinc-400 leading-relaxed">{lead.address}</p>}
              {lead.opening_hours && (
                <p className="text-zinc-500">Saatler: {lead.opening_hours}</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-400">Durum:</label>
              <select
                value={lead.status}
                onChange={(e) => onUpdate(lead.id, { status: e.target.value as LeadStatus })}
                className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border ${statusStyle} bg-[#0B0E12] focus:outline-none cursor-pointer`}
              >
                {VALID_STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-[#11151B] text-zinc-100">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Görüşme Notları</label>
              <textarea
                rows={2}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => {
                  if (notesDraft !== lead.notes) {
                    onUpdate(lead.id, { notes: notesDraft });
                    onNotify("Not kaydedildi", "success");
                  }
                }}
                placeholder="Yetkili adı, geri dönüş saati, teklif notu..."
                className="input-dark w-full rounded-lg px-2.5 py-1.5 text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Col 2: Venue-Adaptive Mobile Mockup & Scannable QR Card */}
        <div className="xl:col-span-3 flex flex-col justify-between border-y xl:border-y-0 xl:border-x border-white/10 py-4 xl:py-0 xl:px-4">
          <div>
            {/* Venue Preset Selector + Photo Upload */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <select
                value={activePreset}
                onChange={(e) =>
                  onUpdate(lead.id, {
                    design_preset: e.target.value as Exclude<VenueDesignPreset, "auto">,
                    accent_color: "",
                  })
                }
                aria-label="Mekan Tasarım Stili"
                className="input-dark rounded-md px-2 py-1 text-[11px] text-[#E5BE6F] max-w-[140px]"
              >
                {VENUE_DESIGN_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[#11151B] text-zinc-100">
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  title="İşletmenin Renk Tonunu Ayarla"
                  value={lead.accent_color || "#D4A853"}
                  onChange={(e) => onUpdate(lead.id, { accent_color: e.target.value })}
                  className="w-5 h-5 rounded border border-white/20 bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  title="İşletmenin fotoğrafını yükle (renk tonu otomatik uyarlanır)"
                  className="text-[11px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1 transition"
                >
                  <Camera className="w-3 h-3 text-[#D4A853]" />
                  <span>{lead.image_url ? "Foto Değiştir" : "Foto Ekle"}</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    mockupUrl &&
                    onOpenLightbox({ lead, kind: "mockup", preset: activePreset, dataUrl: mockupUrl })
                  }
                  className="w-full rounded-xl aspect-[3/4] bg-[#07090C] border border-white/10 hover:border-[#D4A853]/50 overflow-hidden transition group"
                >
                  {mockupUrl ? (
                    <img
                      src={mockupUrl}
                      alt={`${lead.business_name} Mobil Site Taslağı`}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <span className="text-[11px] text-zinc-600">Hazırlanıyor...</span>
                  )}
                </button>
                <p className="text-[11px] text-center text-zinc-400">Mobil Site</p>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    qrUrl &&
                    onOpenLightbox({ lead, kind: "qr", preset: activePreset, dataUrl: qrUrl })
                  }
                  className="w-full rounded-xl aspect-[3/4] bg-[#07090C] border border-white/10 hover:border-[#D4A853]/50 overflow-hidden transition group"
                >
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`${lead.business_name} QR Menü Kartı`}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <span className="text-[11px] text-zinc-600">Hazırlanıyor...</span>
                  )}
                </button>
                <p className="text-[11px] text-center text-zinc-400">QR Menü Kartı</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
            <a
              href={lead.google_maps_url || siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A853] hover:text-[#E5BE6F] inline-flex items-center gap-1 truncate"
            >
              <span>{lead.google_maps_url ? "Google Harita" : "likyastudios.live"}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <button
              type="button"
              onClick={() =>
                mockupUrl &&
                downloadDataUrl(mockupUrl, `${slugify(lead.business_name)}_mobil_site.png`)
              }
              className="text-zinc-400 hover:text-white inline-flex items-center gap-1 shrink-0"
            >
              <Download className="w-3 h-3" />
              <span>PNG İndir</span>
            </button>
          </div>
        </div>

        {/* Col 3: Message Templates + Editable Text + 1-Click Copy & WhatsApp Send */}
        <div className="xl:col-span-5 flex flex-col justify-between space-y-3">
          <div className="flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "first_touch", label: "İlk Temas" },
                    { key: "short_direct", label: "Kısa" },
                    { key: "follow_up", label: "Takip" },
                  ] as { key: MessageTemplateKey; label: string }[]
                ).map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => applyTemplate(tpl.key)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/5 hover:bg-[#D4A853]/15 hover:text-[#E5BE6F] border border-white/10 text-zinc-300 transition"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCopyText(msgDraft, "WhatsApp mesajı kopyalandı")}
                className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition"
              >
                <Copy className="w-3 h-3" />
                <span>Metni Kopyala</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={msgDraft}
              onChange={(e) => setMsgDraft(e.target.value)}
              onBlur={() => {
                if (msgDraft !== lead.custom_message) {
                  onUpdate(lead.id, { custom_message: msgDraft });
                }
              }}
              className="input-dark w-full flex-1 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed resize-y"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!mockupUrl}
                onClick={() => handleCopyImage(mockupUrl, "Mobil site görseli", "mobil_site")}
                className="text-xs px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#D4A853]" />
                <span>Mockup Kopyala</span>
              </button>
              <button
                type="button"
                disabled={!qrUrl}
                onClick={() => handleCopyImage(qrUrl, "QR kart görseli", "qr_kart")}
                className="text-xs px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <QrCode className="w-3.5 h-3.5 text-[#D4A853]" />
                <span>QR Kopyala</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!lead.phone}
              onClick={handleSendWhatsApp}
              className="btn-whatsapp rounded-xl px-4 py-2.5 text-xs sm:text-sm inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp ile Gönder</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
