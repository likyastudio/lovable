import type { Lead, MessageTemplateKey } from "../types";

const KNOWN_DISTRICTS = [
  "Kaleiçi",
  "Konyaaltı",
  "Lara",
  "Muratpaşa",
  "Kepez",
  "Kaş",
  "Kemer",
  "Olimpos",
  "Çıralı",
  "Belek",
  "Side",
  "Alanya",
  "Kalkan",
  "Manavgat",
  "Döşemealtı",
  "Aksu",
];

const TR_ASCII_MAP: Record<string, string> = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", İ: "i", I: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
};

export function toAsciiLower(input: string): string {
  return (input || "")
    .replace(/[çÇğĞıİIöÖşŞüÜ]/g, (ch) => TR_ASCII_MAP[ch] ?? ch)
    .toLowerCase();
}

export function slugify(text: string): string {
  const s = toAsciiLower(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "isletme";
}

export function normalizeTrPhone(raw?: string | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("0090")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("90") && digits.length === 12) {
    // already normalized
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = "90" + digits.slice(1);
  } else if (digits.length === 10 && ["5", "2", "3", "4", "8"].includes(digits[0])) {
    digits = "90" + digits;
  }
  return digits;
}

export function isMobilePhone(phone?: string | null): boolean {
  return /^905\d{9}$/.test((phone || "").trim());
}

export function formatDisplayPhone(phone?: string | null): string {
  const p = (phone || "").trim();
  if (/^90\d{10}$/.test(p)) {
    return `+90 ${p.slice(2, 5)} ${p.slice(5, 8)} ${p.slice(8, 10)} ${p.slice(10, 12)}`;
  }
  return p || "Telefon yok";
}

export function inferDistrict(text: string, fallback = "Antalya"): string {
  const norm = toAsciiLower(text);
  for (const d of KNOWN_DISTRICTS) {
    if (norm.includes(toAsciiLower(d))) {
      return d;
    }
  }
  return fallback;
}

export function buildMessageForTemplate(
  lead: Pick<Lead, "business_name" | "category" | "district" | "google_rating" | "reviews_count">,
  template: MessageTemplateKey = "first_touch",
  siteUrl = "https://likyastudios.live/isletmeler",
  senderName = "Açelya"
): string {
  const ratingPart =
    lead.google_rating && lead.reviews_count
      ? ` (${lead.google_rating.toFixed(1)} puan ve ${lead.reviews_count} yorum gerçekten çok iyi)`
      : lead.google_rating
      ? ` (${lead.google_rating.toFixed(1)} puanınız çok iyi)`
      : "";

  const cat = toAsciiLower(lead.category);
  const offerDetail =
    cat.includes("otel") || cat.includes("pansiyon") || cat.includes("villa") || cat.includes("hotel")
      ? "TR/EN tek sayfa web sitesi ve doğrudan WhatsApp rezervasyon taslağı"
      : cat.includes("kafe") ||
        cat.includes("cafe") ||
        cat.includes("meyhane") ||
        cat.includes("restoran") ||
        cat.includes("pastane") ||
        cat.includes("lokanta") ||
        cat.includes("bar")
      ? "TR/EN mobil web sitesi ve QR kodlu dijital menü taslağı"
      : "TR/EN tek sayfa web sitesi ve QR hizmet kartı taslağı";

  const districtPrefix = lead.district ? `${lead.district} bölgesinde ` : "Antalya'da ";

  if (template === "short_direct") {
    return (
      `Merhaba, ben ${senderName} — LIKYA STUDIOS (${siteUrl}). ` +
      `${lead.business_name} için ücretsiz bir mobil site ve QR menü önizlemesi hazırladım. ` +
      `Kurulum ücreti olmadan, sadece aylık bakım modeliyle birkaç günde yayına alıyoruz. ` +
      `Örnek görselleri buradan göndermemi ister misiniz?`
    );
  }

  if (template === "follow_up") {
    return (
      `Merhaba, geçen hafta ${lead.business_name} için hazırladığımız ücretsiz web sitesi ve QR menü önizlemesiyle ilgili yazmıştım. ` +
      `Yoğun olduğunuzu biliyorum; örnek görselleri görmek isterseniz "evet" yazmanız yeterli (${siteUrl}). ` +
      `Yanıt gelmezse bir daha rahatsız etmem.`
    );
  }

  return (
    `Merhaba, ben ${senderName} — Antalya'dan LIKYA STUDIOS (${siteUrl}). ` +
    `Google Haritalar'da ${lead.business_name}'ı gördüm${ratingPart}. ` +
    `Profilinizde web sitesi olmadığını fark edince sizin için ücretsiz bir ${offerDetail} hazırladım.\n\n` +
    `${districtPrefix}işletmelere kurulum ücreti olmadan, sadece aylık bakım modeliyle hızlıca kuruyoruz. ` +
    `Hazırladığım örnek tasarım görsellerini buradan göndermemi ister misiniz? İstemezseniz bir daha yazmam.`
  );
}
