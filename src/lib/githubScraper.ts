import type { Lead, ScraperEngine } from "../types";
import { normalizeScrapedRecord } from "./leadParser";

const REPO_OWNER = "likyastudio";
const REPO_NAME = "lovable";
const WORKFLOW_FILE = "github-scraper.yml";

export const GITHUB_ACTIONS_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}`;

/**
 * Fetch the latest real Antalya leads directly from GitHub main branch (instant, zero Pages cache delay)
 * with fallback to local ./antalya-live-leads.json.
 */
export async function fetchLatestLiveLeads(options: {
  siteUrl: string;
  senderName: string;
  senderPhone: string;
}): Promise<Lead[]> {
  const urls = [
    `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/public/antalya-live-leads.json?t=${Date.now()}`,
    `./antalya-live-leads.json?t=${Date.now()}`,
  ];

  let rawRows: Record<string, unknown>[] = [];
  for (const url of urls) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          rawRows = json;
          break;
        }
      }
    } catch {
      // try next URL
    }
  }

  const leads: Lead[] = [];
  for (const r of rawRows) {
    const { lead, hasWebsite, hasPhone } = normalizeScrapedRecord(r, options);
    if (!lead || hasWebsite || !hasPhone) continue;
    leads.push(lead);
  }
  return leads;
}

/**
 * Trigger the GitHub Actions open-source scraper workflow (gosom/google-maps-scraper or SerpAPI)
 * directly from the browser using a GitHub Fine-grained PAT (full CORS supported by api.github.com).
 */
export async function dispatchGithubScraperWorkflow(params: {
  githubToken: string;
  engine: ScraperEngine;
  query: string;
  depth: number;
}): Promise<void> {
  const { githubToken, engine, query, depth } = params;
  const resp = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          engine,
          query: query.trim(),
          depth: String(depth),
        },
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(
        "GitHub Token yetkisiz (Actions: Read & Write izni gerekli). Ayarlar'dan kontrol edin."
      );
    }
    throw new Error(`GitHub Actions başlatılamadı (HTTP ${resp.status}): ${text.slice(0, 120)}`);
  }
}

export interface WorkflowRunSummary {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

/**
 * Fetch the latest run status of github-scraper.yml (public repo — works even without a token!).
 */
export async function getLatestScraperRun(
  githubToken?: string
): Promise<WorkflowRunSummary | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (githubToken?.trim()) {
    headers.Authorization = `Bearer ${githubToken.trim()}`;
  }
  const resp = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`,
    { headers, cache: "no-store" }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const run = data?.workflow_runs?.[0];
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    html_url: run.html_url,
    created_at: run.created_at,
  };
}

/**
 * Direct browser Apify Google Maps Scraper (compass~crawler-google-places, full CORS).
 */
export async function fetchFromApifyLive(params: {
  token: string;
  query: string;
  limit: number;
  siteUrl: string;
  senderName: string;
  senderPhone: string;
}): Promise<{
  fetched: number;
  leads: Lead[];
  skippedWithSite: number;
  skippedNoPhone: number;
}> {
  const { token, query, limit, siteUrl, senderName, senderPhone } = params;
  const endpoint = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(
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
        ? "Apify API Token geçersiz (401). Ayarlar'dan kontrol edin."
        : `Apify hatası (HTTP ${resp.status}): ${errText.slice(0, 140)}`
    );
  }

  const rawItems: Record<string, unknown>[] = await resp.json();
  const items = Array.isArray(rawItems) ? rawItems : [];

  const leads: Lead[] = [];
  let skippedWithSite = 0;
  let skippedNoPhone = 0;

  for (const raw of items) {
    const { lead, hasWebsite, hasPhone } = normalizeScrapedRecord(
      { ...raw, source: "Apify" },
      { defaultDistrict: "Antalya", siteUrl, senderName, senderPhone }
    );
    if (!lead) continue;
    if (hasWebsite) {
      skippedWithSite++;
      continue;
    }
    if (!hasPhone) {
      skippedNoPhone++;
      continue;
    }
    leads.push(lead);
  }

  return { fetched: items.length, leads, skippedWithSite, skippedNoPhone };
}
