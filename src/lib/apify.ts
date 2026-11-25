import type { Lead, VenueDesignPreset } from "../types";
import { buildMessageForTemplate, inferDistrict, normalizeTrPhone, toAsciiLower } from "./phone";

const APIFY_ACTOR = "compass~crawler-google-places";

const SOCIAL_ONLY_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "linktr.ee",
  "wa.me",
  "whatsapp.com",
  "tiktok.com",
];

export function hasRealWebsite(rawWebsite?: string | null): boolean {
  if (!rawWebsite || !String(rawWebsite).trim()) return false;
  const url = String(rawWebsite).trim().toLowerCase();
  return !SOCIAL_ONLY_DOMAINS.some((d) => url.includes(d));
}

export function detectVenuePreset(
  category: string,
  businessName = "",
  description = ""
): Exclude<VenueDesignPreset, "auto"> {
  const text = toAsciiLower(`${category} ${businessName} ${description}`);
  if (
    text.includes("otel") ||
    text.includes("hotel") ||
    text.includes("pansiyon") ||
    text.includes("villa") ||
    text.includes("konak") ||
    text.includes("suites") ||
    text.includes("apart")
  ) {
    return "boutique-stone";
  }
  if (
    text.includes("meyhane") ||
    text.includes("restoran") ||
    text.includes("restaurant") ||
    text.includes("balik") ||
    text.includes("meze") ||
    text.includes("ocakbasi") ||
    text.includes("lokanta") ||
    text.includes("kebap") ||
    text.includes("steak")
  ) {
    return "aegean-tavern";
  }
  if (
    text.includes("guzellik") ||
    text.includes("kuafor") ||
    text.includes("estetik") ||
    text.includes("spa") ||
    text.includes("klinik") ||
    text.includes("beauty") ||
    text.includes("nail") ||
    text.includes("pilates") ||
    text.includes("diyetisyen") ||
    text.includes("dis ")
  ) {
    return "atelier-beauty";
  }
  if (
    text.includes("tekne") ||
    text.includes("tur") ||
    text.includes("tour") ||
    text.includes("dalis") ||
    text.includes("diving") ||
    text.includes("beach") ||
    text.includes("plaj") ||
    text.includes("transfer") ||
    text.includes("yat") ||
    text.includes("rafting")
  ) {
    return "coastal-club";
  }
  if (
    text.includes("kafe") ||
    text.includes("cafe") ||
    text.includes("coffee") ||
    text.includes("kahve") ||
    text.includes("pastane") ||
    text.includes("firin") ||
    text.includes("bake") ||
    text.includes("tatli") ||
    text.includes("roast") ||
    text.includes("bistro") ||
    text.includes("bar")
  ) {
    return "roastery-warm";
  }
  return "modern-craft";
}

function formatOpeningHours(raw: unknown): string {
  if (!raw) return "Her gün 09:00 – 23:30";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    const parts = raw
      .slice(0, 2)
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const obj = entry as Record<string, unknown>;
          if (obj.day && obj.hours) return `${obj.day}: ${obj.hours}`;
        }
        return "";
      })
      .filter(Boolean);
    return parts.join(" · ") || "Her gün 09:00 – 23:30";
  }
  return "Her gün 09:00 – 23:30";
}

function extractHighlights(raw: Record<string, unknown>): string[] {
  const tags: string[] = [];

  if (Array.isArray(raw.highlights)) {
    for (const h of raw.highlights) {
      if (typeof h === "string" && h.trim()) tags.push(h.trim());
    }
  }

  if (Array.isArray(raw.reviewsTags)) {
    for (const t of raw.reviewsTags) {
      if (t && typeof t === "object" && "title" in t) {
        const title = String((t as Record<string, unknown>).title || "").trim();
        if (title) tags.push(title);
      } else if (typeof t === "string" && t.trim()) {
        tags.push(t.trim());
      }
    }
  }

  if (Array.isArray(raw.categories)) {
    for (const c of raw.categories.slice(0, 3)) {
      if (typeof c === "string" && c.trim()) tags.push(c.trim());
    }
  }

  if (raw.additionalInfo && typeof raw.additionalInfo === "object") {
    const info = raw.additionalInfo as Record<string, unknown>;
    for (const sectionVal of Object.values(info)) {
      if (Array.isArray(sectionVal)) {
        for (const entry of sectionVal) {
          if (entry && typeof entry === "object") {
            for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
              if (v === true && k.length <= 26) tags.push(k);
            }
          }
        }
      }
    }
  }

  // Deduplicate and return top 4 concise highlights
  return Array.from(new Set(tags)).slice(0, 4);
}

function extractImageUrl(raw: Record<string, unknown>): string {
  if (typeof raw.imageUrl === "string" && raw.imageUrl.trim()) return raw.imageUrl.trim();
  if (typeof raw.image_url === "string" && raw.image_url.trim()) return raw.image_url.trim();
  if (Array.isArray(raw.imageUrls) && typeof raw.imageUrls[0] === "string") {
    return raw.imageUrls[0].trim();
  }
  if (Array.isArray(raw.images) && raw.images[0]) {
    const first = raw.images[0];
    if (typeof first === "string") return first.trim();
    if (typeof first === "object" && first && "imageUrl" in first) {
      return String((first as Record<string, unknown>).imageUrl || "").trim();
    }
  }
  return "";
}

export function normalizeRawItemToLead(
  raw: Record<string, unknown>,
  options: { defaultDistrict?: string; siteUrl: string; senderName: string }
): { lead: Lead | null; hasWebsite: boolean; hasPhone: boolean } {
  const businessName = String(raw.title || raw.business_name || raw.name || "").trim();
  if (!businessName) return { lead: null, hasWebsite: false, hasPhone: false };

  const website = String(raw.website || raw.url_website || "");
  const hasWebsite = hasRealWebsite(website);

  const phone = normalizeTrPhone(
    String(raw.phone || raw.phoneUnformatted || raw.telephone || "")
  );
  const hasPhone = phone.length >= 10;

  const address = String(raw.address || raw.street || raw.fullAddress || "").trim();
  const categoriesArr = Array.isArray(raw.categories) ? raw.categories : [];
  const category = String(
    raw.categoryName || raw.category || categoriesArr[0] || "Yerel İşletme"
  ).trim();
  const district = String(
    raw.district || inferDistrict(address, options.defaultDistrict || "Antalya")
  ).trim();
  const description = String(raw.description || raw.subTitle || "").trim();
  const imageUrl = extractImageUrl(raw);
  const highlights = extractHighlights(raw);

  const ratingRaw = raw.totalScore ?? raw.google_rating;
  const google_rating =
    ratingRaw !== undefined && ratingRaw !== null && ratingRaw !== ""
      ? Math.round(Number(ratingRaw) * 10) / 10
      : null;

  const reviewsRaw = raw.reviewsCount ?? raw.reviews_count ?? 0;
  const reviews_count = Number.isFinite(Number(reviewsRaw)) ? Math.round(Number(reviewsRaw)) : 0;

  const now = new Date().toISOString();
  const preset = detectVenuePreset(category, businessName, description);

  const baseLead: Lead = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    business_name: businessName,
    category,
    district,
    phone,
    google_rating: Number.isFinite(google_rating) ? google_rating : null,
    reviews_count,
    address,
    opening_hours: formatOpeningHours(raw.openingHours ?? raw.opening_hours),
    image_url: imageUrl,
    description,
    highlights,
    design_preset: preset,
    google_maps_url: String(raw.url || raw.google_maps_url || "").trim(),
    custom_message: "",
    status: "Görsel Hazır",
    notes: "",
    created_at: now,
    updated_at: now,
  };

  baseLead.custom_message = buildMessageForTemplate(
    baseLead,
    "first_touch",
    options.siteUrl,
    options.senderName
  );

  return { lead: baseLead, hasWebsite, hasPhone };
}

export interface ApifyFetchResult {
  fetched: number;
  leads: Lead[];
  skippedWithSite: number;
  skippedNoPhone: number;
}

export async function fetchFromApifyLive(params: {
  token: string;
  query: string;
  limit: number;
  noWebsiteOnly: boolean;
  phoneOnly: boolean;
  siteUrl: string;
  senderName: string;
}): Promise<ApifyFetchResult> {
  const { token, query, limit, noWebsiteOnly, phoneOnly, siteUrl, senderName } = params;
  const endpoint = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(
    token.trim()
  )}&format=json&clean=true`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchStringsArray: [query.trim()],
      maxCrawledPlacesPerSearch: Math.max(1, Math.min(limit, 50)),
      language: "tr",
      countryCode: "tr",
      includeWebResults: false,
      maxImages: 1,
      scrapePlaceDetailPage: false,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(
      resp.status === 401
        ? "Apify API Token geçersiz veya yetkisiz (401). Ayarlar'dan kontrol edin."
        : `Apify hatası (HTTP ${resp.status}): ${errText.slice(0, 140)}`
    );
  }

  const rawItems: Record<string, unknown>[] = await resp.json();
  const items = Array.isArray(rawItems) ? rawItems : [];
  const defaultDistrict = inferDistrict(query, "Antalya");

  const leads: Lead[] = [];
  let skippedWithSite = 0;
  let skippedNoPhone = 0;

  for (const raw of items) {
    const { lead, hasWebsite, hasPhone } = normalizeRawItemToLead(raw, {
      defaultDistrict,
      siteUrl,
      senderName,
    });
    if (!lead) continue;
    if (noWebsiteOnly && hasWebsite) {
      skippedWithSite++;
      continue;
    }
    if (phoneOnly && !hasPhone) {
      skippedNoPhone++;
      continue;
    }
    leads.push(lead);
  }

  return {
    fetched: items.length,
    leads,
    skippedWithSite,
    skippedNoPhone,
  };
}

export function parseCsvText(csvText: string): Record<string, unknown>[] {
  const lines = csvText.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const splitLine = (line: string) => {
    const res: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        res.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });
}

export function getInitialSeedLeads(siteUrl: string, senderName: string): Lead[] {
  const rawSeed: Record<string, unknown>[] = [
    {
      title: "Surlariçi Meze & Meyhane",
      categoryName: "Meyhane",
      district: "Kaleiçi",
      phone: "+90 532 418 72 90",
      totalScore: 4.9,
      reviewsCount: 708,
      address: "Hesapçı Sk. No:24, Selçuk Mah., Kaleiçi, Antalya",
      openingHours: "Her gün 16:00 – 01:00",
      description: "Tarihi Kaleiçi avlusunda günlük Ege mezeleri, taze deniz ürünleri ve fasıl akşamları.",
      highlights: ["Günlük Taze Meze", "Tarihi Avlu", "Canlı Müzik", "Rezervasyon"],
    },
    {
      title: "Begonvil Avlu Butik Otel",
      categoryName: "Butik Otel",
      district: "Kaleiçi",
      phone: "0 (533) 612 45 18",
      totalScore: 4.8,
      reviewsCount: 412,
      address: "Kılınçarslan Mah., Hıdırlık Sk. No:11, Kaleiçi, Antalya",
      openingHours: "7/24 Resepsiyon",
      description: "Begonvillerle çevrili taş konak odaları, serpme Akdeniz kahvaltısı ve merkeze yürüme mesafesi.",
      highlights: ["Taş Konak", "Bahçe Kahvaltı", "Mermerli Plaj 3 dk", "Havalimanı Transfer"],
    },
    {
      title: "Falez Roastery & Bakehouse",
      categoryName: "Kafe",
      district: "Konyaaltı",
      phone: "+90 542 891 33 04",
      totalScore: 4.7,
      reviewsCount: 534,
      address: "Gürsu Mah., Atatürk Blv. No:142, Konyaaltı, Antalya",
      openingHours: "Her gün 08:00 – 23:30",
      description: "Üçüncü nesil nitelikli kahve kavurma, ekşi mayalı taze kruvasanlar ve sakin çalışma alanı.",
      highlights: ["Özel Kavrum", "Taze Kruvasan", "Yüksek Hızlı Wi-Fi", "Teras"],
    },
    {
      title: "Aura Estetik & Güzellik",
      categoryName: "Güzellik Salonu",
      district: "Lara",
      phone: "+90 544 705 19 62",
      totalScore: 4.9,
      reviewsCount: 194,
      address: "Fener Mah., Tekelioğlu Cd. No:31, Lara, Antalya",
      openingHours: "Pzt–Cmt 09:30 – 20:00",
      description: "Kişiye özel medikal cilt bakımı, kalıcı makyaj ve profesyonel bakım protokolleri.",
      highlights: ["Hydrafacial", "İpek Kirpik", "Steril Kabin", "Aynı Gün Randevu"],
    },
  ];

  return rawSeed
    .map((r) => normalizeRawItemToLead(r, { siteUrl, senderName }).lead)
    .filter((x): x is Lead => Boolean(x));
}
