import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Lead, LeadStatus, PanelSettings, VenueDesignPreset } from "./types";
import { VALID_STATUSES } from "./types";
import {
  detectVenuePreset,
  getInitialSeedLeads,
  normalizeRawItemToLead,
  parseCsvText,
} from "./lib/apify";
import {
  fetchFromSerpApiPool,
  runLeadProvider,
  type LeadProvider,
} from "./lib/providers";
import {
  buildMessageForTemplate,
  isMobilePhone,
  normalizeTrPhone,
  slugify,
  toAsciiLower,
} from "./lib/phone";
import {
  copyDataUrlToClipboard,
  downloadDataUrl,
  renderMobileMockupDataUrl,
  renderQrCardDataUrl,
} from "./lib/canvasGenerator";
import { PinGate } from "./components/PinGate";
import { SettingsModal } from "./components/SettingsModal";
import { AddLeadModal } from "./components/AddLeadModal";
import { ImageModal } from "./components/ImageModal";
import { LeadCard } from "./components/LeadCard";

const LEADS_STORAGE_KEY = "likya_panel_v2_leads";
const SETTINGS_STORAGE_KEY = "likya_panel_v2_settings";
const UNLOCK_STORAGE_KEY = "likya_panel_v2_unlocked";

const ANTALYA_QUICK_QUERIES = [
  "Antalya kafe",
  "Antalya restoran",
  "Antalya butik otel",
  "Antalya meyhane",
  "Antalya güzellik salonu",
  "Antalya pastane",
  "Antalya tekne turu",
  "Antalya diş kliniği",
];

interface ToastItem {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

function loadInitialSettings(): PanelSettings {
  const envToken = (import.meta.env.VITE_APIFY_API_TOKEN as string | undefined) || "";
  const envOutscraper = (import.meta.env.VITE_OUTSCRAPER_API_KEY as string | undefined) || "";
  const envPin = (import.meta.env.VITE_PANEL_PIN as string | undefined) || "2026";
  const defaults: PanelSettings = {
    apifyToken: envToken,
    outscraperKey: envOutscraper,
    siteUrl: "https://likyastudios.live/isletmeler",
    senderName: "Açelya",
    senderPhone: "+90 545 776 05 57",
    defaultPreset: "auto",
    panelPin: envPin,
    pinEnabled: true,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PanelSettings>;
    return {
      ...defaults,
      ...parsed,
      senderPhone: parsed.senderPhone || "+90 545 776 05 57",
      defaultPreset: parsed.defaultPreset || "auto",
      apifyToken: parsed.apifyToken || envToken,
      outscraperKey: parsed.outscraperKey || envOutscraper,
    };
  } catch {
    return defaults;
  }
}

function loadInitialLeads(settings: PanelSettings): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to seed
  }
  return getInitialSeedLeads(settings.siteUrl, settings.senderName);
}

export default function App() {
  const [settings, setSettings] = useState<PanelSettings>(loadInitialSettings);
  const [leads, setLeads] = useState<Lead[]>(() => loadInitialLeads(loadInitialSettings()));
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    const s = loadInitialSettings();
    if (!s.pinEnabled) return true;
    return (
      localStorage.getItem(UNLOCK_STORAGE_KEY) === "1" ||
      sessionStorage.getItem(UNLOCK_STORAGE_KEY) === "1"
    );
  });

  // Multi-source fetch controls — All Antalya by default
  const [provider, setProvider] = useState<LeadProvider>("osm");
  const [apifyQuery, setApifyQuery] = useState("Antalya kafe");
  const [apifyLimit, setApifyLimit] = useState(15);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(true);
  const [phoneOnly, setPhoneOnly] = useState(true);
  const [isFetchingApify, setIsFetchingApify] = useState(false);
  const [fetchStatusMsg, setFetchStatusMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [mobileOnlyFilter, setMobileOnlyFilter] = useState(false);

  // Modals & Lightbox
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    lead: Lead;
    kind: "mockup" | "qr";
    preset: Exclude<VenueDesignPreset, "auto">;
    dataUrl: string;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // ignore storage quota errors
    }
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Auto-load real SerpAPI Antalya pool (public/antalya-live-leads.json) once so real leads appear immediately
  useEffect(() => {
    const syncKey = "likya_panel_v2_serpapi_synced_v1";
    if (localStorage.getItem(syncKey)) return;
    fetchFromSerpApiPool({
      query: "",
      noWebsiteOnly: true,
      phoneOnly: true,
      siteUrl: settings.siteUrl,
      senderName: settings.senderName,
    })
      .then((res) => {
        if (res.leads.length > 0) {
          mergeIncomingLeads(res.leads);
          localStorage.setItem(syncKey, "1");
        }
      })
      .catch(() => {
        // ignore if pool json absent
      });
  }, []);

  function notify(message: string, tone: "default" | "success" | "error" = "default") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }

  function mergeIncomingLeads(incoming: Lead[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    setLeads((prev) => {
      const next = [...prev];
      for (const item of incoming) {
        const idx = next.findIndex(
          (existing) =>
            (item.phone && existing.phone === item.phone) ||
            existing.business_name.toLowerCase() === item.business_name.toLowerCase()
        );
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            category: item.category || next[idx].category,
            district: item.district || next[idx].district,
            phone: item.phone || next[idx].phone,
            google_rating: item.google_rating ?? next[idx].google_rating,
            reviews_count: item.reviews_count || next[idx].reviews_count,
            address: item.address || next[idx].address,
            opening_hours: item.opening_hours || next[idx].opening_hours,
            image_url: next[idx].image_url || item.image_url,
            description: next[idx].description || item.description,
            highlights:
              next[idx].highlights && next[idx].highlights.length
                ? next[idx].highlights
                : item.highlights,
            google_maps_url: next[idx].google_maps_url || item.google_maps_url,
            updated_at: new Date().toISOString(),
          };
          updated++;
        } else {
          next.unshift(item);
          added++;
        }
      }
      return next;
    });

    return { added, updated };
  }

  async function handleApifyFetch(overrideQuery?: string) {
    const targetQuery = (overrideQuery ?? apifyQuery).trim();
    if (!targetQuery && provider !== "serpapi_pool") {
      notify("Lütfen arama kelimesi girin (örn: Antalya kafe)", "error");
      return;
    }

    const providerLabels: Record<LeadProvider, string> = {
      osm: "OpenStreetMap (Ücretsiz)",
      serpapi_pool: "SerpAPI Antalya Havuzu",
      outscraper: "Outscraper (Google Maps)",
      apify: "Apify (Google Maps)",
    };

    setIsFetchingApify(true);
    setFetchStatusMsg(
      `${providerLabels[provider]} ile tüm Antalya taranıyor: "${targetQuery || "Tümü"}"...`
    );

    try {
      const res = await runLeadProvider({
        provider,
        query: targetQuery,
        limit: apifyLimit,
        noWebsiteOnly,
        phoneOnly,
        siteUrl: settings.siteUrl,
        senderName: settings.senderName,
        apifyToken: settings.apifyToken,
        outscraperKey: settings.outscraperKey,
      });

      const { added, updated } = mergeIncomingLeads(res.leads);
      const summary = `${providerLabels[provider]}: ${res.fetched} kayıt incelendi → ${added} yeni eklendi, ${updated} güncellendi (${res.skippedWithSite} siteli, ${res.skippedNoPhone} telefonsuz elendi).`;
      setFetchStatusMsg(summary);
      notify(summary, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tarama sırasında hata oluştu";
      setFetchStatusMsg(`Hata: ${msg}`);
      notify(msg, "error");
      if (msg.includes("Ayarlar")) setSettingsOpen(true);
    } finally {
      setIsFetchingApify(false);
    }
  }

  function handleUpdateLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l
      )
    );
  }

  function handleDeleteLead(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    notify("Kayıt silindi");
  }

  function handleAddManualLead(payload: {
    business_name: string;
    category: string;
    district: string;
    phone: string;
    google_rating: number | null;
    reviews_count: number;
    address: string;
    opening_hours: string;
  }) {
    const now = new Date().toISOString();
    const newLead: Lead = {
      id: crypto.randomUUID ? crypto.randomUUID() : `lead_${Date.now()}`,
      business_name: payload.business_name,
      category: payload.category,
      district: payload.district,
      phone: normalizeTrPhone(payload.phone),
      google_rating: payload.google_rating,
      reviews_count: payload.reviews_count,
      address: payload.address,
      opening_hours: payload.opening_hours,
      design_preset: detectVenuePreset(payload.category, payload.business_name),
      custom_message: "",
      status: "Görsel Hazır",
      notes: "",
      created_at: now,
      updated_at: now,
    };
    newLead.custom_message = buildMessageForTemplate(
      newLead,
      "first_touch",
      settings.siteUrl,
      settings.senderName
    );
    mergeIncomingLeads([newLead]);
    notify(`${newLead.business_name} eklendi ve mekana özel görselleri hazırlandı`, "success");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      let rawRows: Record<string, unknown>[] = [];
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        rawRows = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
          ? parsed.items
          : [];
      } else {
        rawRows = parseCsvText(text);
      }

      const incoming: Lead[] = [];
      for (const r of rawRows) {
        const { lead, hasWebsite, hasPhone } = normalizeRawItemToLead(r, {
          siteUrl: settings.siteUrl,
          senderName: settings.senderName,
        });
        if (!lead) continue;
        if (noWebsiteOnly && hasWebsite) continue;
        if (phoneOnly && !hasPhone) continue;
        incoming.push(lead);
      }
      const { added, updated } = mergeIncomingLeads(incoming);
      notify(`Dosyadan aktarıldı: ${added} yeni, ${updated} güncellendi`, "success");
    } catch (err) {
      notify(
        `Dosya okunamadı: ${err instanceof Error ? err.message : "Geçersiz format"}`,
        "error"
      );
    }
  }

  function handleExportBackup() {
    const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `likya_panel_v2_yedek_${new Date().toISOString().slice(0, 10)}.json`);
    URL.revokeObjectURL(url);
    notify("Tüm kayıtlar JSON yedeği olarak indirildi", "success");
  }

  async function handleLightboxPresetChange(nextPreset: Exclude<VenueDesignPreset, "auto">) {
    if (!lightbox) return;
    const updatedLead: Lead = { ...lightbox.lead, design_preset: nextPreset, accent_color: "" };
    handleUpdateLead(lightbox.lead.id, { design_preset: nextPreset, accent_color: "" });
    const nextUrl =
      lightbox.kind === "mockup"
        ? await renderMobileMockupDataUrl(updatedLead, nextPreset)
        : await renderQrCardDataUrl(updatedLead, settings.siteUrl, nextPreset);
    setLightbox({ ...lightbox, lead: updatedLead, preset: nextPreset, dataUrl: nextUrl });
  }

  async function handleLightboxAccentChange(hex: string) {
    if (!lightbox) return;
    const updatedLead: Lead = { ...lightbox.lead, accent_color: hex };
    handleUpdateLead(lightbox.lead.id, { accent_color: hex });
    const nextUrl =
      lightbox.kind === "mockup"
        ? await renderMobileMockupDataUrl(updatedLead, lightbox.preset)
        : await renderQrCardDataUrl(updatedLead, settings.siteUrl, lightbox.preset);
    setLightbox({ ...lightbox, lead: updatedLead, dataUrl: nextUrl });
  }

  const kpis = useMemo(() => {
    const total = leads.length;
    const waiting = leads.filter((l) => l.status === "Yeni" || l.status === "Görsel Hazır").length;
    const sent = leads.filter((l) =>
      ["Mesaj Atıldı", "Görüşülüyor", "Satış Kapandı"].includes(l.status)
    ).length;
    const positive = leads.filter((l) =>
      ["Görüşülüyor", "Satış Kapandı"].includes(l.status)
    ).length;
    const closed = leads.filter((l) => l.status === "Satış Kapandı").length;
    const mobileCount = leads.filter((l) => isMobilePhone(l.phone)).length;
    return { total, waiting, sent, positive, closed, mobileCount };
  }, [leads]);

  const districts = useMemo(
    () => Array.from(new Set(leads.map((l) => l.district).filter(Boolean))).sort(),
    [leads]
  );

  const categories = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category).filter(Boolean))).sort(),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const q = toAsciiLower(search.trim());
    const statusOrder: Record<LeadStatus, number> = {
      "Görsel Hazır": 1,
      Yeni: 2,
      Görüşülüyor: 3,
      "Mesaj Atıldı": 4,
      "Satış Kapandı": 5,
      İstemiyor: 6,
    };

    return leads
      .filter((l) => {
        if (districtFilter && l.district !== districtFilter) return false;
        if (categoryFilter && l.category !== categoryFilter) return false;
        if (statusFilter && l.status !== statusFilter) return false;
        if (mobileOnlyFilter && !isMobilePhone(l.phone)) return false;
        if (q) {
          const hay = toAsciiLower(
            `${l.business_name} ${l.district} ${l.category} ${l.phone} ${l.address} ${l.notes} ${l.description || ""}`
          );
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const diff = (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9);
        if (diff !== 0) return diff;
        return (b.reviews_count || 0) - (a.reviews_count || 0);
      });
  }, [leads, search, districtFilter, categoryFilter, statusFilter, mobileOnlyFilter]);

  if (settings.pinEnabled && !unlocked) {
    return (
      <PinGate
        expectedPin={settings.panelPin || "2026"}
        onUnlock={(remember) => {
          if (remember) localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
          else sessionStorage.setItem(UNLOCK_STORAGE_KEY, "1");
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090B0E]/92 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-[#D4A853]/40 bg-[#D4A853]/12 flex items-center justify-center font-editorial italic font-semibold text-[#D4A853] text-lg">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold text-[#F4F0E6] leading-tight">
                  LIKYA STUDIOS
                </h1>
                <span className="font-mono-num text-[11px] px-2 py-0.5 rounded-md bg-[#D4A853]/12 border border-[#D4A853]/30 text-[#E5BE6F]">
                  PANEL V2
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tüm Antalya B2B Satış · Mekana Özel Görsel Üretici · Tek Tıkla WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={settings.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 inline-flex items-center gap-1.5 transition"
            >
              <span>likyastudios.live</span>
              <ExternalLink className="w-3 h-3 text-[#D4A853]" />
            </a>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>Ayarlar &amp; API</span>
            </button>

            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="btn-gold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Manuel Ekle</span>
            </button>

            {settings.pinEnabled && (
              <button
                type="button"
                title="Paneli Kilitle"
                onClick={() => {
                  localStorage.removeItem(UNLOCK_STORAGE_KEY);
                  sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
                  setUnlocked(false);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 1. KPI Summary Bar */}
        <section aria-label="Satış Özeti" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="surface-card rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wider text-zinc-400 font-medium">
                Toplam İşletme
              </span>
              <span className="font-mono-num text-zinc-500">{kpis.mobileCount} cep tel</span>
            </div>
            <p className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-white">
              {kpis.total}
            </p>
          </div>

          <div className="surface-card rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wider text-zinc-400 font-medium">
                Mesaj Bekleyen
              </span>
              <span className="text-[#D4A853]">Görsel Hazır</span>
            </div>
            <p className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-[#D4A853]">
              {kpis.waiting}
            </p>
          </div>

          <div className="surface-card rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wider text-zinc-400 font-medium">
                Gönderilen Mesaj
              </span>
              <span className="text-sky-400">WhatsApp</span>
            </div>
            <p className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-sky-300">
              {kpis.sent}
            </p>
          </div>

          <div className="surface-card rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="uppercase tracking-wider text-zinc-400 font-medium">
                Olumlu / Satış
              </span>
              <span className="text-emerald-400">{kpis.closed} satış kapandı</span>
            </div>
            <p className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold text-emerald-400">
              {kpis.positive}
            </p>
          </div>
        </section>

        {/* 2. Multi-Source All-Antalya Lead Fetch Bar */}
        <section aria-label="Çok Kaynaklı İşletme Çekme" className="surface-card rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3.5">
            <div className="w-full lg:w-64">
              <label
                htmlFor="providerSelect"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Veri Kaynağı
              </label>
              <select
                id="providerSelect"
                value={provider}
                onChange={(e) => setProvider(e.target.value as LeadProvider)}
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm text-[#E5BE6F]"
              >
                <option value="osm">OpenStreetMap (100% Ücretsiz · Anahtarsız)</option>
                <option value="serpapi_pool">SerpAPI Antalya Havuzu (Gerçek · Hazır)</option>
                <option value="outscraper">Outscraper (500 Ücretsiz/Ay · Google Maps)</option>
                <option value="apify">Apify (Google Maps)</option>
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="apifyQueryInput"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Tüm Antalya Arama Kelimesi
              </label>
              <input
                id="apifyQueryInput"
                type="text"
                value={apifyQuery}
                onChange={(e) => setApifyQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isFetchingApify && handleApifyFetch()}
                placeholder="Örn: Antalya kafe, Antalya restoran, Antalya butik otel, Alanya kuaför, Kaş pansiyon..."
                className="input-dark w-full rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="w-full sm:w-32">
              <label
                htmlFor="apifyLimitSelect"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Limit
              </label>
              <select
                id="apifyLimitSelect"
                value={apifyLimit}
                onChange={(e) => setApifyLimit(Number(e.target.value))}
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value={10}>10 işletme</option>
                <option value={15}>15 işletme</option>
                <option value={25}>25 işletme</option>
                <option value={40}>40 işletme</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 pb-2.5 text-xs sm:text-sm text-zinc-300">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noWebsiteOnly}
                  onChange={(e) => setNoWebsiteOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#D4A853]"
                />
                <span>Sitesi olmayanlar</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={phoneOnly}
                  onChange={(e) => setPhoneOnly(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Telefonu olanlar</span>
              </label>
            </div>

            <button
              type="button"
              disabled={isFetchingApify}
              onClick={() => handleApifyFetch()}
              className="btn-gold rounded-xl px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isFetchingApify ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Taranıyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>İşletme Çek</span>
                </>
              )}
            </button>
          </div>

          {/* 1-Click All-Antalya Quick Sector Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 mr-1">Hızlı Antalya Taraması:</span>
            {ANTALYA_QUICK_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isFetchingApify}
                onClick={() => setApifyQuery(q)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  apifyQuery === q
                    ? "border-[#D4A853]/60 bg-[#D4A853]/15 text-[#E5BE6F]"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {fetchStatusMsg && (
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-zinc-200">
                {isFetchingApify ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4A853] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{fetchStatusMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setFetchStatusMsg("")}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Gizle
              </button>
            </div>
          )}
        </section>

        {/* 3. Instant Filters */}
        <section aria-label="Filtreleme ve Arama" className="surface-card rounded-2xl p-3.5 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İşletme adı, telefon, ilçe, adres veya not ara..."
                className="input-dark w-full rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm İlçeler / Semtler</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm Sektörler</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm Durumlar</option>
                {VALID_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mobileOnlyFilter}
                  onChange={(e) => setMobileOnlyFilter(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Sadece 905...</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDistrictFilter("");
                  setCategoryFilter("");
                  setStatusFilter("");
                  setMobileOnlyFilter(false);
                }}
                title="Filtreleri Sıfırla"
                className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>
              <strong className="text-zinc-300 font-mono-num">{filteredLeads.length}</strong>{" "}
              işletme listeleniyor
            </span>
            <span>
              Her işletmeye kendi fotoğrafı + sektör stiliyle tasarım üretilir ·{" "}
              <strong className="text-[#E5BE6F]">Mockup Kopyala</strong> →{" "}
              <strong className="text-emerald-400">WhatsApp ile Gönder</strong>
            </span>
          </div>
        </section>

        {/* 4. Leads List */}
        <section aria-label="İşletme Kartları" className="space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="surface-card rounded-2xl p-12 text-center">
              <p className="text-zinc-300 font-medium">Filtrelere uyan işletme bulunamadı.</p>
              <p className="text-xs text-zinc-500 mt-1">
                Yukarıdan Tüm Antalya için Apify taraması başlatabilir veya filtreleri sıfırlayabilirsiniz.
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                defaultPreset={settings.defaultPreset}
                siteUrl={settings.siteUrl}
                senderName={settings.senderName}
                senderPhone={settings.senderPhone}
                onUpdate={handleUpdateLead}
                onDelete={handleDeleteLead}
                onOpenLightbox={setLightbox}
                onNotify={notify}
              />
            ))
          )}
        </section>
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onSave={(next) => {
          setSettings(next);
          notify("Ayarlar kaydedildi", "success");
        }}
        onExportBackup={handleExportBackup}
        onImportFile={handleImportFile}
        onClose={() => setSettingsOpen(false)}
      />

      <AddLeadModal
        isOpen={addModalOpen}
        onAdd={handleAddManualLead}
        onClose={() => setAddModalOpen(false)}
      />

      <ImageModal
        isOpen={Boolean(lightbox)}
        title={
          lightbox
            ? `${lightbox.lead.business_name} — ${
                lightbox.kind === "mockup" ? "Mobil Site Taslağı" : "QR Menü Kartı"
              }`
            : ""
        }
        subtitle={
          lightbox
            ? `${lightbox.lead.district} · ${lightbox.lead.category} · ${
                lightbox.kind === "qr" ? `QR → ${settings.siteUrl}` : "Mekana Özel TR/EN Tasarım"
              }`
            : ""
        }
        dataUrl={lightbox?.dataUrl || ""}
        preset={lightbox?.preset || "aegean-tavern"}
        accentColor={lightbox?.lead.accent_color}
        onChangePreset={handleLightboxPresetChange}
        onChangeAccent={handleLightboxAccentChange}
        onCopy={async () => {
          if (!lightbox) return;
          const ok = await copyDataUrlToClipboard(lightbox.dataUrl);
          if (ok) {
            notify("Görsel panoya kopyalandı — WhatsApp'a yapıştırabilirsiniz", "success");
          } else {
            downloadDataUrl(
              lightbox.dataUrl,
              `${slugify(lightbox.lead.business_name)}_${lightbox.kind}.png`
            );
            notify("PNG indirildi");
          }
        }}
        onDownload={() => {
          if (!lightbox) return;
          downloadDataUrl(
            lightbox.dataUrl,
            `${slugify(lightbox.lead.business_name)}_${lightbox.kind}.png`
          );
          notify("PNG indirildi", "success");
        }}
        onClose={() => setLightbox(null)}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl border text-xs sm:text-sm shadow-2xl ${
              t.tone === "success"
                ? "border-emerald-500/40 bg-[#0D1F1A] text-emerald-200"
                : t.tone === "error"
                ? "border-red-500/40 bg-[#231012] text-red-200"
                : "border-[#D4A853]/35 bg-[#151A23] text-zinc-100"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
