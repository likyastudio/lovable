import type { Lead, VenueDesignPreset } from "../types";
import { buildMessageForTemplate, inferDistrict, normalizeTrPhone, toAsciiLower } from "./phone";

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
  if (!raw) return "Her gün açık";
  if (typeof raw === "string") return raw.trim() || "Her gün açık";
  if (typeof raw === "object" && !Array.isArray(raw)) {
    // gosom format: { Monday: ["09:00–23:00"], ... }
    const entries = Object.entries(raw as Record<string, unknown>).slice(0, 2);
    const parts = entries
      .map(([day, val]) => {
        const hrs = Array.isArray(val) ? val.join(", ") : String(val || "");
        return hrs ? `${day}: ${hrs}` : "";
      })
      .filter(Boolean);
    return parts.join(" · ") || "Her gün açık";
  }
  return "Her gün açık";
}

/**
 * Normalize records from:
 * - gosom/google-maps-scraper (JSONL / CSV)
 * - Mahanaicoach/google-maps-scraper-kit (CSV)
 * - omkarcloud/google-maps-scraper (CSV / JSON)
 * - SerpAPI JSON
 */
export function normalizeScrapedRecord(
  raw: Record<string, unknown>,
  options: {
    defaultDistrict?: string;
    siteUrl: string;
    senderName: string;
    senderPhone: string;
  }
): { lead: Lead | null; hasWebsite: boolean; hasPhone: boolean } {
  const businessName = String(
    raw.title || raw.business_name || raw.name || raw.Name || ""
  ).trim();
  if (!businessName) return { lead: null, hasWebsite: false, hasPhone: false };

  const website = String(
    raw.web_site || raw.website || raw.Website || raw.site || ""
  ).trim();
  const hasWebsite = hasRealWebsite(website);

  const phone = normalizeTrPhone(
    String(raw.phone || raw.Phone || raw.phoneUnformatted || raw.telephone || "")
  );
  const hasPhone = phone.length >= 10;

  const address = String(
    raw.address || raw.Address || raw.full_address || raw.street || ""
  ).trim();
  const category = String(
    raw.category ||
      raw.categoryName ||
      raw.Category ||
      raw.type ||
      (Array.isArray(raw.categories) ? raw.categories[0] : "") ||
      "Yerel İşletme"
  ).trim();

  const district = String(
    raw.district || inferDistrict(address, options.defaultDistrict || "Antalya")
  ).trim();

  const ratingRaw =
    raw.review_rating ?? raw.totalScore ?? raw.rating ?? raw.Rating ?? raw.google_rating;
  const parsedRating =
    ratingRaw !== undefined && ratingRaw !== null && ratingRaw !== ""
      ? Math.round(Number(String(ratingRaw).replace(",", ".")) * 10) / 10
      : null;

  const reviewsRaw =
    raw.review_count ?? raw.reviewsCount ?? raw.reviews ?? raw.Reviews ?? raw.reviews_count ?? 0;
  const reviews_count = Number.isFinite(Number(reviewsRaw)) ? Math.round(Number(reviewsRaw)) : 0;

  const imageUrl = String(
    raw.thumbnail ||
      raw.imageUrl ||
      raw.image_url ||
      raw.photo ||
      (Array.isArray(raw.images) && raw.images[0] && typeof raw.images[0] === "object"
        ? (raw.images[0] as Record<string, unknown>).image || ""
        : "") ||
      ""
  ).trim();

  const description = String(
    raw.description || raw.descriptions || raw.subTitle || ""
  ).trim();

  const highlights: string[] = [];
  if (Array.isArray(raw.highlights)) {
    for (const h of raw.highlights) {
      if (typeof h === "string" && h.trim()) highlights.push(h.trim());
    }
  } else if (Array.isArray(raw.categories)) {
    for (const c of raw.categories.slice(0, 3)) {
      if (typeof c === "string" && c.trim()) highlights.push(c.trim());
    }
  }

  const mapsUrl = String(
    raw.link || raw.url || raw.google_maps_url || raw.location_link || ""
  ).trim();

  const now = new Date().toISOString();
  const preset = detectVenuePreset(category, businessName, description);

  const lead: Lead = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    business_name: businessName,
    category,
    district,
    phone,
    google_rating: parsedRating !== null && Number.isFinite(parsedRating) ? parsedRating : null,
    reviews_count,
    address,
    opening_hours: formatOpeningHours(
      raw.open_hours ?? raw.openingHours ?? raw.opening_hours ?? raw.hours
    ),
    image_url: imageUrl,
    description,
    highlights: Array.from(new Set(highlights)).slice(0, 4),
    design_preset: preset,
    google_maps_url: mapsUrl,
    source: String(raw.source || "GitHub Scraper"),
    custom_message: "",
    status: "Görsel Hazır",
    notes: "",
    created_at: now,
    updated_at: now,
  };

  lead.custom_message = buildMessageForTemplate(
    lead,
    "first_touch",
    options.siteUrl,
    options.senderName,
    options.senderPhone
  );

  return { lead, hasWebsite, hasPhone };
}

/**
 * Parse JSON array, JSON Lines (.jsonl from gosom), or CSV (.csv from gosom / Mahanaicoach / omkarcloud).
 */
export function parseUploadedLeadFile(filename: string, text: string): Record<string, unknown>[] {
  const lower = filename.toLowerCase();
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (lower.endsWith(".jsonl") || (trimmed.startsWith("{") && trimmed.includes("\n{")) || (trimmed.startsWith("[") && trimmed.includes("\n["))) {
    const out: Record<string, unknown>[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) continue;
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          for (const el of parsed) {
            if (el && typeof el === "object") out.push(el as Record<string, unknown>);
          }
        } else if (parsed && typeof parsed === "object") {
          out.push(parsed as Record<string, unknown>);
        }
      } catch {
        // skip malformed line
      }
    }
    return out;
  }

  if (lower.endsWith(".json") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    return [];
  }

  // RFC-4180 CSV parser
  const lines = trimmed.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
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
