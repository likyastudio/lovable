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
    digits = "90" + digits[1] + digits.slice(2);
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

function getSectorBenefit(category: string, businessName = ""): string {
  const text = toAsciiLower(`${category} ${businessName}`);

  if (
    text.includes("guzellik") ||
    text.includes("beauty") ||
    text.includes("kuafor") ||
    text.includes("estetik") ||
    text.includes("spa") ||
    text.includes("nail") ||
    text.includes("tirnak") ||
    text.includes("kirpik")
  ) {
    return "işlem fotoğraflarınızı sergileyebileceğiniz ve danışanlarınızın online randevu alabileceği";
  }

  if (
    text.includes("dis") ||
    text.includes("klinik") ||
    text.includes("diyetisyen") ||
    text.includes("doktor") ||
    text.includes("psikolog")
  ) {
    return "hizmetlerinizi tanıtıp danışanlarınızın kolayca online randevu alabileceği";
  }

  if (
    text.includes("otel") ||
    text.includes("hotel") ||
    text.includes("pansiyon") ||
    text.includes("villa") ||
    text.includes("konak") ||
    text.includes("suites") ||
    text.includes("apart")
  ) {
    return "odalarınızı Türkçe ve İngilizce sergileyebileceğiniz ve misafirlerinizin doğrudan rezervasyon yapabileceği";
  }

  if (
    text.includes("meyhane") ||
    text.includes("restoran") ||
    text.includes("restaurant") ||
    text.includes("balik") ||
    text.includes("meze") ||
    text.includes("ocakbasi") ||
    text.includes("lokanta") ||
    text.includes("kebap")
  ) {
    return "menünüzü ve mekan atmosferinizi sergileyebileceğiniz, misafirlerinizin kolayca masa ayırtabileceği";
  }

  if (
    text.includes("kafe") ||
    text.includes("cafe") ||
    text.includes("coffee") ||
    text.includes("kahve") ||
    text.includes("pastane") ||
    text.includes("pasta") ||
    text.includes("cake") ||
    text.includes("tatli") ||
    text.includes("firin") ||
    text.includes("bistro")
  ) {
    return "ürünlerinizi ve QR dijital menünüzü sergileyebileceğiniz, misafirlerinizin size kolayca ulaşabileceği";
  }

  if (
    text.includes("tekne") ||
    text.includes("tur") ||
    text.includes("transfer") ||
    text.includes("dalis") ||
    text.includes("beach") ||
    text.includes("plaj")
  ) {
    return "turlarınızı Türkçe ve İngilizce tanıtıp misafirlerinizden doğrudan rezervasyon alabileceğiniz";
  }

  return "hizmetlerinizi sergileyebileceğiniz ve müşterilerinizin size tek tıkla ulaşabileceği";
}

/**
 * Clean, warm, sincere Turkish WhatsApp messages — zero fluff, zero walls of text.
 */
export function buildMessageForTemplate(
  lead: Pick<Lead, "business_name" | "category" | "district" | "google_rating" | "reviews_count">,
  template: MessageTemplateKey = "first_touch",
  siteUrl = "https://likyastudios.live",
  _senderName = "Likya Studios",
  _senderPhone = ""
): string {
  const cleanSite = (siteUrl || "https://likyastudios.live").replace(/\/isletmeler\/?$/, "");
  const benefit = getSectorBenefit(lead.category, lead.business_name);

  if (template === "short_direct") {
    return (
      `Merhaba, ${lead.business_name} yetkilisiyle mi görüşüyorum? ` +
      `Google Haritalar'da işletmenizi gördük ancak bir web sitenizi bulamadık. ` +
      `Likya Studios olarak, ${benefit} uygun fiyatlı bir web sitesi geliştirebiliriz. ` +
      `Çalışmalarımıza ${cleanSite} adresinden veya Instagram'da @likyastudios hesabından bakabilirsiniz. ` +
      `İlgilenirseniz buradan yazmanız yeterli. İstemezseniz haber verin, tekrar yazmayacağız. Likya Studios`
    );
  }

  if (template === "follow_up") {
    return (
      `Merhaba, geçen hafta ${lead.business_name} için hazırladığımız örnek web sitesi taslağıyla ilgili yazmıştık. ` +
      `Yoğun olduğunuzu biliyoruz; incelemek isterseniz buradan yazmanız yeterli. ` +
      `İstemezseniz haber verin, tekrar yazmayacağız. Likya Studios`
    );
  }

  // Default: Warm, concise message specifically written to accompany the venue preview image
  return (
    `Merhaba, ${lead.business_name} yetkilisiyle mi görüşüyorum? ` +
    `Google Haritalar'da işletmenizi gördük ancak bir web sitenizi bulamadık. ` +
    `Likya Studios olarak, ${benefit} uygun fiyatlı bir web sitesi geliştirebiliriz. ` +
    `Fikir vermesi için işletmenize özel hazırladığımız örnek tasarım görselini ekte paylaşıyoruz. ` +
    `Çalışmalarımıza ${cleanSite} adresinden veya Instagram'da @likyastudios hesabından bakabilirsiniz. ` +
    `İlgilenirseniz buradan yazmanız yeterli. İstemezseniz haber verin, tekrar yazmayacağız. Likya Studios`
  );
}
