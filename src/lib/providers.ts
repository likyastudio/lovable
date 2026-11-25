import type { Lead } from "../types";
import { fetchFromApifyLive, normalizeRawItemToLead } from "./apify";
import { inferDistrict, toAsciiLower } from "./phone";

export type LeadProvider = "outscraper" | "osm" | "apify" | "serpapi_pool";

export interface ProviderFetchResult {
  provider: LeadProvider;
  fetched: number;
  leads: Lead[];
  skippedWithSite: number;
  skippedNoPhone: number;
}

/**
 * 1. Outscraper Google Maps API v3 (500 FREE businesses/month, full browser CORS!)
 */
export async function fetchFromOutscraperLive(params: {
  apiKey: string;
  query: string;
  limit: number;
  noWebsiteOnly: boolean;
  phoneOnly: boolean;
  siteUrl: string;
  senderName: string;
}): Promise<ProviderFetchResult> {
  const { apiKey, query, limit, noWebsiteOnly, phoneOnly, siteUrl, senderName } = params;
  const qs = new URLSearchParams({
    query: query.trim(),
    limit: String(Math.max(1, Math.min(limit, 50))),
    language: "tr",
    region: "TR",
    async: "false",
  });

  const resp = await fetch(`https://api.app.outscraper.com/maps/search-v3?${qs.toString()}`, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey.trim(),
    },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(
      resp.status === 401 || resp.status === 403
        ? "Outscraper API anahtarı geçersiz. app.outscraper.com/profile üzerinden kontrol edin."
        : `Outscraper hatası (HTTP ${resp.status}): ${errText.slice(0, 140)}`
    );
  }

  const json = await resp.json();
  const rows: Record<string, unknown>[] = Array.isArray(json?.data?.[0])
    ? json.data[0]
    : Array.isArray(json?.data)
    ? json.data
    : [];

  const defaultDistrict = inferDistrict(query, "Antalya");
  const leads: Lead[] = [];
  let skippedWithSite = 0;
  let skippedNoPhone = 0;

  for (const item of rows) {
    const mapped: Record<string, unknown> = {
      title: item.name,
      categoryName: item.category || item.type || item.subtypes,
      phone: item.phone,
      totalScore: item.rating,
      reviewsCount: item.reviews,
      address: item.full_address || item.street || "",
      openingHours: item.working_hours_old_format || item.working_hours,
      website: item.site || item.website || "",
      imageUrl: item.photo || item.street_view || "",
      description: item.description || "",
      url: item.location_link || "",
      district: item.borough || item.city || defaultDistrict,
    };

    const { lead, hasWebsite, hasPhone } = normalizeRawItemToLead(mapped, {
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
    provider: "outscraper",
    fetched: rows.length,
    leads,
    skippedWithSite,
    skippedNoPhone,
  };
}

/**
 * 2. OpenStreetMap Overpass API (100% FREE, NO API KEY, UNLIMITED, Direct Browser CORS!)
 */
function buildOverpassFilter(query: string): { key: string; value: string; label: string } {
  const q = toAsciiLower(query);
  if (q.includes("otel") || q.includes("pansiyon") || q.includes("hotel") || q.includes("villa")) {
    return { key: "tourism", value: "hotel|guest_house|hostel|apartment", label: "Butik Otel" };
  }
  if (q.includes("restoran") || q.includes("meyhane") || q.includes("lokanta") || q.includes("balik")) {
    return { key: "amenity", value: "restaurant|bar|pub", label: "Restoran" };
  }
  if (q.includes("guzellik") || q.includes("kuafor") || q.includes("berber") || q.includes("spa")) {
    return { key: "shop", value: "beauty|hairdresser", label: "Güzellik & Kuaför" };
  }
  if (q.includes("pastane") || q.includes("firin")) {
    return { key: "shop", value: "bakery|pastry|confectionery", label: "Pastane" };
  }
  if (q.includes("dis") || q.includes("klinik") || q.includes("doktor")) {
    return { key: "amenity", value: "dentist|clinic|doctors", label: "Klinik" };
  }
  if (q.includes("oto") || q.includes("servis") || q.includes("tamir")) {
    return { key: "shop", value: "car_repair", label: "Oto Servis" };
  }
  return { key: "amenity", value: "cafe|fast_food", label: "Kafe" };
}

export async function fetchFromOpenStreetMapLive(params: {
  query: string;
  limit: number;
  noWebsiteOnly: boolean;
  phoneOnly: boolean;
  siteUrl: string;
  senderName: string;
}): Promise<ProviderFetchResult> {
  const { query, limit, noWebsiteOnly, phoneOnly, siteUrl, senderName } = params;
  const { key, value, label } = buildOverpassFilter(query);

  // Bounding box covering greater Antalya (Kemer -> Konyaaltı -> Merkez -> Lara -> Belek -> Side -> Alanya)
  const bbox = "36.50,30.40,37.05,32.10";
  const phoneClause = phoneOnly ? '["phone"]' : "";
  const ql = `[out:json][timeout:25];(nwr["${key}"~"${value}"]["name"]${phoneClause}(${bbox}););out center ${Math.max(
    10,
    Math.min(limit * 3, 120)
  )};`;

  const resp = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(ql)}`,
  });

  if (!resp.ok) {
    throw new Error(`OpenStreetMap Overpass geçici olarak yoğun (HTTP ${resp.status}). Tekrar deneyin.`);
  }

  const data = await resp.json();
  const elements: Array<{ id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> =
    Array.isArray(data?.elements) ? data.elements : [];

  const leads: Lead[] = [];
  let skippedWithSite = 0;
  let skippedNoPhone = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags["name:tr"] || "";
    if (!name) continue;

    const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "";
    const website = tags.website || tags["contact:website"] || "";
    const addrParts = [
      tags["addr:street"],
      tags["addr:housenumber"] ? `No:${tags["addr:housenumber"]}` : "",
      tags["addr:suburb"] || tags["addr:neighbourhood"],
      tags["addr:district"] || tags["addr:city"] || "Antalya",
    ].filter(Boolean);

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    const { lead, hasWebsite, hasPhone } = normalizeRawItemToLead(
      {
        title: name,
        categoryName: label,
        phone,
        address: addrParts.join(", "),
        openingHours: tags.opening_hours || "Her gün açık",
        website,
        description: tags.description || "",
        url: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : "",
      },
      { defaultDistrict: "Antalya", siteUrl, senderName }
    );

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
    if (leads.length >= limit) break;
  }

  return {
    provider: "osm",
    fetched: elements.length,
    leads,
    skippedWithSite,
    skippedNoPhone,
  };
}

/**
 * 3. Load Real SerpAPI Antalya Live Pool (public/antalya-live-leads.json — updated via SerpAPI / GitHub Actions)
 */
export async function fetchFromSerpApiPool(params: {
  query?: string;
  noWebsiteOnly: boolean;
  phoneOnly: boolean;
  siteUrl: string;
  senderName: string;
}): Promise<ProviderFetchResult> {
  const resp = await fetch("./antalya-live-leads.json?t=" + Date.now());
  if (!resp.ok) {
    throw new Error("SerpAPI Antalya havuz dosyası bulunamadı.");
  }
  const rows: Record<string, unknown>[] = await resp.json();
  const qNorm = toAsciiLower((params.query || "").replace(/antalya/gi, "").trim());

  const leads: Lead[] = [];
  let skippedWithSite = 0;
  let skippedNoPhone = 0;

  for (const r of rows) {
    if (qNorm) {
      const hay = toAsciiLower(`${r.title || ""} ${r.categoryName || ""} ${r.query || ""} ${r.address || ""}`);
      if (!hay.includes(qNorm)) continue;
    }
    const { lead, hasWebsite, hasPhone } = normalizeRawItemToLead(r, {
      defaultDistrict: "Antalya",
      siteUrl: params.siteUrl,
      senderName: params.senderName,
    });
    if (!lead) continue;
    if (params.noWebsiteOnly && hasWebsite) {
      skippedWithSite++;
      continue;
    }
    if (params.phoneOnly && !hasPhone) {
      skippedNoPhone++;
      continue;
    }
    leads.push(lead);
  }

  return {
    provider: "serpapi_pool",
    fetched: rows.length,
    leads,
    skippedWithSite,
    skippedNoPhone,
  };
}

export async function runLeadProvider(params: {
  provider: LeadProvider;
  query: string;
  limit: number;
  noWebsiteOnly: boolean;
  phoneOnly: boolean;
  siteUrl: string;
  senderName: string;
  apifyToken: string;
  outscraperKey: string;
}): Promise<ProviderFetchResult> {
  if (params.provider === "osm") {
    return fetchFromOpenStreetMapLive(params);
  }
  if (params.provider === "outscraper") {
    if (!params.outscraperKey.trim()) {
      throw new Error("Outscraper API anahtarı boş. Ayarlar'dan ücretsiz Outscraper anahtarınızı girin.");
    }
    return fetchFromOutscraperLive({
      apiKey: params.outscraperKey,
      query: params.query,
      limit: params.limit,
      noWebsiteOnly: params.noWebsiteOnly,
      phoneOnly: params.phoneOnly,
      siteUrl: params.siteUrl,
      senderName: params.senderName,
    });
  }
  if (params.provider === "serpapi_pool") {
    return fetchFromSerpApiPool({
      query: params.query,
      noWebsiteOnly: params.noWebsiteOnly,
      phoneOnly: params.phoneOnly,
      siteUrl: params.siteUrl,
      senderName: params.senderName,
    });
  }
  if (!params.apifyToken.trim()) {
    throw new Error("Apify API Token boş. Ayarlar'dan girin veya Ücretsiz OpenStreetMap / SerpAPI seçin.");
  }
  const apifyRes = await fetchFromApifyLive({
    token: params.apifyToken,
    query: params.query,
    limit: params.limit,
    noWebsiteOnly: params.noWebsiteOnly,
    phoneOnly: params.phoneOnly,
    siteUrl: params.siteUrl,
    senderName: params.senderName,
  });
  return {
    provider: "apify",
    ...apifyRes,
  };
}
