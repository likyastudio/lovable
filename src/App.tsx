import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Github,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import type {
  Lead,
  LeadStatus,
  PanelSettings,
  ScraperEngine,
  VenueDesignPreset,
} from "./types";
import { VALID_STATUSES } from "./types";
import {
  detectVenuePreset,
  normalizeScrapedRecord,
  parseUploadedLeadFile,
} from "./lib/leadParser";
import {
  dispatchGithubScraperWorkflow,
  fetchFromApifyLive,
  fetchLatestLiveLeads,
  getLatestScraperRun,
  GITHUB_ACTIONS_URL,
} from "./lib/githubScraper";
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

// Fresh v3 key wipes any old fake demo records cleanly and starts with 100% real Antalya data
const LEADS_STORAGE_KEY = "likya_crm_v3_real_leads";
const SETTINGS_STORAGE_KEY = "likya_crm_v3_settings";
const UNLOCK_STORAGE_KEY = "likya_panel_v2_unlocked";

const ANTALYA_QUICK_QUERIES = [
  "Antalya kafe",
  "Antalya restoran",
  "Antalya butik otel",
  "Antalya meyhane",
  "Antalya güzellik salonu",
  "Antalya pastane",
  "Alanya butik otel",
  "Kaş restoran",
];

interface ToastItem {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

function loadInitialSettings(): PanelSettings {
  const envApifyToken = (import.meta.env.VITE_APIFY_API_TOKEN as string | undefined) || "";
  const envGithubToken = (import.meta.env.VITE_GITHUB_TOKEN as string | undefined) || "";
  const envPin = (import.meta.env.VITE_PANEL_PIN as string | undefined) || "2026";
  let legacyApify = "";
  try {
    const oldRaw = localStorage.getItem("likya_panel_v2_settings");
    if (oldRaw) legacyApify = JSON.parse(oldRaw)?.apifyToken || "";
  } catch {
    // ignore
  }
  const defaults: PanelSettings = {
    apifyToken: envApifyToken || legacyApify,
    githubToken: envGithubToken,
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
      apifyToken: parsed.apifyToken || envApifyToken || legacyApify,
      senderPhone: parsed.senderPhone || "+90 545 776 05 57",
      defaultPreset: parsed.defaultPreset || "auto",
      githubToken: parsed.githubToken || envGithubToken,
    };
  } catch {
    return defaults;
  }
}

function loadInitialLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // start empty and auto-sync real leads from GitHub immediately
  }
  return [];
}

export default function App() {
  const [settings, setSettings] = useState<PanelSettings>(loadInitialSettings);
  const [leads, setLeads] = useState<Lead[]>(loadInitialLeads);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    const s = loadInitialSettings();
    if (!s.pinEnabled) return true;
    return (
      localStorage.getItem(UNLOCK_STORAGE_KEY) === "1" ||
      sessionStorage.getItem(UNLOCK_STORAGE_KEY) === "1"
    );
  });

  // Multi-Engine Controls: Apify (Live Browser) + gosom (Free GitHub) + SerpAPI (GitHub)
  const [engine, setEngine] = useState<ScraperEngine>("apify");
  const [query, setQuery] = useState("Antalya kafe");
  const [depth, setDepth] = useState(2);
  const [isScraping, setIsScraping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scrapeStatusMsg, setScrapeStatusMsg] = useState("");
  const [lastRunUrl, setLastRunUrl] = useState("");
  const quickUploadRef = useRef<HTMLInputElement>(null);

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

  // Always sync latest REAL Antalya leads from GitHub main branch on startup
  useEffect(() => {
    syncLiveLeadsFromGithub(true);
  }, []);

  function notify(message: string, tone: "default" | "success" | "error" = "default") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
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
            source: next[idx].source || item.source,
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

  async function syncLiveLeadsFromGithub(silent = false) {
    setIsSyncing(true);
    try {
      const freshLeads = await fetchLatestLiveLeads({
        siteUrl: settings.siteUrl,
        senderName: settings.senderName,
        senderPhone: settings.senderPhone,
      });
      const { added } = mergeIncomingLeads(freshLeads);
      if (!silent) {
        notify(
          added > 0
            ? `GitHub'dan ${added} yeni gerçek Antalya işletmesi eklendi!`
            : `Liste güncel (${freshLeads.length} gerçek işletme senkronize)`,
          "success"
        );
      }
    } catch (err) {
      if (!silent) {
        notify(
          `Liste yenilenemedi: ${err instanceof Error ? err.message : "Ağ hatası"}`,
          "error"
        );
      }
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRunGithubScraper() {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      notify("Lütfen arama kelimesi girin (örn: Antalya kafe)", "error");
      return;
    }

    // 1. Apify runs directly from browser with full CORS!
    if (engine === "apify") {
      if (!settings.apifyToken.trim()) {
        notify("Apify taraması için Ayarlar'dan Apify API Token'ınızı girin", "error");
        setSettingsOpen(true);
        return;
      }
      setIsScraping(true);
      const limitMap: Record<number, number> = { 1: 10, 2: 20, 3: 35 };
      const limit = limitMap[depth] || 20;
      setScrapeStatusMsg(`Apify ile tüm Antalya taranıyor: "${cleanQuery}"... (15–45 sn sürebilir)`);
      try {
        const res = await fetchFromApifyLive({
          token: settings.apifyToken,
          query: cleanQuery,
          limit,
          siteUrl: settings.siteUrl,
          senderName: settings.senderName,
          senderPhone: settings.senderPhone,
        });
        const { added, updated } = mergeIncomingLeads(res.leads);
        const summary = `Apify tamamlandı: ${res.fetched} yer tarandı → ${added} yeni eklendi, ${updated} güncellendi (${res.skippedWithSite} siteli, ${res.skippedNoPhone} telefonsuz elendi).`;
        setScrapeStatusMsg(summary);
        notify(summary, "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Apify hatası";
        setScrapeStatusMsg(`Hata: ${msg}`);
        notify(msg, "error");
      } finally {
        setIsScraping(false);
      }
      return;
    }

    // 2. gosom / SerpAPI run on GitHub Actions
    if (!settings.githubToken.trim()) {
      try {
        await navigator.clipboard.writeText(cleanQuery);
      } catch {
        // ignore clipboard errors
      }
      window.open(GITHUB_ACTIONS_URL, "_blank", "noopener,noreferrer");
      setScrapeStatusMsg(
        `GitHub Actions sayfası açıldı ("${cleanQuery}" panoya kopyalandı). "Run workflow" ile başlatın, bitince "Listeyi Yenile"ye basın — veya Ayarlar'a GitHub Token girerek buradan tek tıkla çalıştırın.`
      );
      notify("GitHub Actions açıldı! Run workflow ile ücretsiz taramayı başlatın.", "default");
      return;
    }

    setIsScraping(true);
    const engineLabel = engine === "gosom" ? "gosom/google-maps-scraper (Ücretsiz)" : "SerpAPI";
    setScrapeStatusMsg(`${engineLabel} GitHub Actions üzerinde başlatılıyor: "${cleanQuery}"...`);

    try {
      const beforeRun = await getLatestScraperRun(settings.githubToken);
      const beforeId = beforeRun?.id ?? 0;

      await dispatchGithubScraperWorkflow({
        githubToken: settings.githubToken,
        engine,
        query: cleanQuery,
        depth,
      });

      setScrapeStatusMsg(`${engineLabel} çalışıyor... GitHub sunucusunda "${cleanQuery}" taranıyor.`);

      // Poll up to 4 minutes for GitHub Actions run to complete
      let runUrl = GITHUB_ACTIONS_URL;
      for (let attempt = 0; attempt < 48; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const latest = await getLatestScraperRun(settings.githubToken);
        if (!latest || latest.id === beforeId) continue;
        runUrl = latest.html_url;
        setLastRunUrl(runUrl);

        if (latest.status === "completed") {
          if (latest.conclusion === "success") {
            await syncLiveLeadsFromGithub(false);
            setScrapeStatusMsg(`Tamamlandı! "${cleanQuery}" sonuçları panele eklendi.`);
          } else {
            setScrapeStatusMsg(`Tarama tamamlandı (${latest.conclusion}). Loglara GitHub'dan bakın.`);
            notify(`GitHub Actions sonucu: ${latest.conclusion}`, "error");
          }
          setIsScraping(false);
          return;
        }
        setScrapeStatusMsg(
          `${engineLabel} çalışıyor (${latest.status === "queued" ? "sırada" : "taranıyor"})...`
        );
      }
      setScrapeStatusMsg("Tarama arka planda devam ediyor; bitince 'Listeyi Yenile' butonuna basın.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "GitHub Actions hatası";
      setScrapeStatusMsg(`Hata: ${msg}`);
      notify(msg, "error");
    } finally {
      setIsScraping(false);
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
      source: "Manuel",
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
      settings.senderName,
      settings.senderPhone
    );
    mergeIncomingLeads([newLead]);
    notify(`${newLead.business_name} eklendi ve mekana özel görselleri hazırlandı`, "success");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const rawRows = parseUploadedLeadFile(file.name, text);

      const incoming: Lead[] = [];
      let skippedWithSite = 0;
      let skippedNoPhone = 0;

      for (const r of rawRows) {
        const { lead, hasWebsite, hasPhone } = normalizeScrapedRecord(r, {
          siteUrl: settings.siteUrl,
          senderName: settings.senderName,
          senderPhone: settings.senderPhone,
        });
        if (!lead) continue;
        if (hasWebsite) {
          skippedWithSite++;
          continue;
        }
        if (!hasPhone) {
          skippedNoPhone++;
          continue;
        }
        incoming.push(lead);
      }
      const { added, updated } = mergeIncomingLeads(incoming);
      notify(
        `${file.name}: ${added} yeni, ${updated} güncellendi (${skippedWithSite} siteli, ${skippedNoPhone} telefonsuz elendi)`,
        "success"
      );
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
    downloadDataUrl(url, `likya_crm_yedek_${new Date().toISOString().slice(0, 10)}.json`);
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
                <span className="font-mono-num text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/12 border border-emerald-500/30 text-emerald-300">
                  GITHUB SCRAPER CRM
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                gosom/google-maps-scraper + SerpAPI · Mekana Özel Görsel · 0545 776 05 57 WhatsApp
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
              disabled={isSyncing}
              onClick={() => syncLiveLeadsFromGithub(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Listeyi Yenile</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 inline-flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>Ayarlar</span>
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
                Gerçek İşletme
              </span>
              <span className="font-mono-num text-emerald-400">{kpis.mobileCount} cep tel</span>
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

        {/* 2. GitHub Open-Source Scraper Bar (gosom + SerpAPI + Local CSV/JSONL Import) */}
        <section
          aria-label="GitHub Açık Kaynak Scraper"
          className="surface-card rounded-2xl p-4 sm:p-5 space-y-3.5"
        >
          <div className="flex flex-col lg:flex-row lg:items-end gap-3.5">
            <div className="w-full lg:w-72">
              <label
                htmlFor="engineSelect"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Tarama Motoru
              </label>
              <select
                id="engineSelect"
                value={engine}
                onChange={(e) => setEngine(e.target.value as ScraperEngine)}
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm text-[#E5BE6F]"
              >
                <option value="apify">Apify Google Maps (Canlı · Doğrudan Panelden)</option>
                <option value="gosom">gosom/google-maps-scraper (GitHub · %100 Ücretsiz)</option>
                <option value="serpapi">SerpAPI Google Maps (GitHub · 250 Ücretsiz/Ay)</option>
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="scraperQueryInput"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Tüm Antalya Arama Kelimesi (Sitesi Olmayan &amp; Telefonlu)
              </label>
              <input
                id="scraperQueryInput"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isScraping && handleRunGithubScraper()}
                placeholder="Örn: Antalya kafe, Antalya restoran, Alanya butik otel, Kaş pansiyon..."
                className="input-dark w-full rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="w-full sm:w-28">
              <label
                htmlFor="depthSelect"
                className="block text-[11px] font-mono-num uppercase tracking-wider text-zinc-400 mb-1.5"
              >
                Miktar
              </label>
              <select
                id="depthSelect"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="input-dark w-full rounded-xl px-3 py-2.5 text-sm"
              >
                <option value={1}>Hızlı (10)</option>
                <option value={2}>Orta (20)</option>
                <option value={3}>Derin (35)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isScraping}
                onClick={handleRunGithubScraper}
                className="btn-gold rounded-xl px-4 py-2.5 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Taranıyor...</span>
                  </>
                ) : engine === "apify" ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apify ile İşletme Çek</span>
                  </>
                ) : (
                  <>
                    {settings.githubToken ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    <span>
                      {settings.githubToken ? "GitHub Tarama Başlat" : "GitHub'da Başlat ↗"}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => quickUploadRef.current?.click()}
                title="gosom, Mahanaicoach veya omkarcloud CSV/JSONL dosyasını yükle"
                className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 inline-flex items-center gap-1.5 whitespace-nowrap transition"
              >
                <Upload className="w-4 h-4 text-[#D4A853]" />
                <span>CSV / JSONL</span>
              </button>
              <input
                ref={quickUploadRef}
                type="file"
                accept=".csv,.json,.jsonl"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* 1-Click All-Antalya Quick Sector Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 mr-1">Hızlı Antalya Taraması:</span>
            {ANTALYA_QUICK_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isScraping}
                onClick={() => setQuery(q)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  query === q
                    ? "border-[#D4A853]/60 bg-[#D4A853]/15 text-[#E5BE6F]"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {scrapeStatusMsg && (
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-zinc-200">
                {isScraping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4A853] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{scrapeStatusMsg}</span>
              </div>
              <div className="flex items-center gap-3">
                {lastRunUrl && (
                  <a
                    href={lastRunUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#D4A853] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Canlı Log ↗</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setScrapeStatusMsg("")}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Gizle
                </button>
              </div>
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
              gerçek işletme listeleniyor
            </span>
            <span>
              Hızlı Akış: <strong className="text-[#E5BE6F]">Mockup Kopyala</strong> →{" "}
              <strong className="text-emerald-400">WhatsApp ile Gönder</strong> (0545 776 05 57)
            </span>
          </div>
        </section>

        {/* 4. Leads List */}
        <section aria-label="İşletme Kartları" className="space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="surface-card rounded-2xl p-12 text-center space-y-3">
              <p className="text-zinc-300 font-medium">
                {isSyncing
                  ? "GitHub'dan gerçek Antalya işletmeleri yükleniyor..."
                  : "Filtrelere uyan işletme bulunamadı."}
              </p>
              {!isSyncing && (
                <button
                  type="button"
                  onClick={() => syncLiveLeadsFromGithub(false)}
                  className="btn-gold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gerçek Antalya Listesini Yükle</span>
                </button>
              )}
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
