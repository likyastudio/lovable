import type { Lead, VenueDesignPreset } from "../types";
import { detectVenuePreset } from "./leadParser";
import { toAsciiLower } from "./phone";

interface SiteItem {
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  price: string;
}

interface SiteThemeSpec {
  isLight: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentOn: string;
  heroGrad: string;
  headingFont: string;
  bodyFont: string;
  googleFontsUrl: string;
  eyebrowTr: string;
  eyebrowEn: string;
  taglineTr: string;
  taglineEn: string;
  sectionTitleTr: string;
  sectionTitleEn: string;
  ctaTr: string;
  ctaEn: string;
  ctaWaMsg: string;
  badgeTr: string;
  badgeEn: string;
  heroLayout: "fullbleed" | "editorial-split" | "arch-spa" | "cozy-card" | "coastal-banner" | "trust-clean";
}

function isHexLight(hex: string): boolean {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145;
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteTheme(
  preset: Exclude<VenueDesignPreset, "auto">,
  customAccent?: string
): SiteThemeSpec {
  let spec: SiteThemeSpec;

  switch (preset) {
    case "boutique-stone":
      spec = {
        isLight: true,
        bg: "#F4EDE2",
        surface: "#FBF7F0",
        surfaceAlt: "#EAE0D0",
        border: "rgba(28, 24, 20, 0.12)",
        text: "#1C1814",
        textMuted: "#5E5449",
        accent: "#8C5A3C",
        accentOn: "#FBF7F0",
        heroGrad: "linear-gradient(135deg, #4B392B 0%, #241A13 100%)",
        headingFont: "'Cormorant Garamond', Georgia, serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        eyebrowTr: "BUTİK KONAKLAMA · DOĞRUDAN REZERVASYON",
        eyebrowEn: "BOUTIQUE STAY · DIRECT RESERVATION",
        taglineTr: "Akdeniz'in kalbinde huzurlu odalar, yerel kahvaltı ve doğrudan rezervasyon ayrıcalığı.",
        taglineEn: "Peaceful stone rooms in the heart of Antalya, homemade breakfast, and direct booking rates.",
        sectionTitleTr: "Odalar & Konaklama Seçenekleri",
        sectionTitleEn: "Rooms & Stay Options",
        ctaTr: "WhatsApp ile Rezervasyon",
        ctaEn: "Book via WhatsApp",
        ctaWaMsg: "Merhaba, oda müsaitliği ve fiyat bilgisi alabilir miyim?",
        badgeTr: "Komisyonsuz Direkt Fiyat",
        badgeEn: "Best Direct Rate",
        heroLayout: "editorial-split",
      };
      break;

    case "roastery-warm":
      spec = {
        isLight: false,
        bg: "#14100E",
        surface: "#1E1714",
        surfaceAlt: "#29201B",
        border: "rgba(246, 238, 228, 0.10)",
        text: "#F6EEE4",
        textMuted: "#B7A89A",
        accent: "#D89B58",
        accentOn: "#14100E",
        heroGrad: "linear-gradient(135deg, #52331D 0%, #17110E 100%)",
        headingFont: "'Playfair Display', Georgia, serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        eyebrowTr: "GÜNLÜK TAZE KAVRUM & LEZZETLER",
        eyebrowEn: "FRESH ROAST & ARTISAN BAKERY",
        taglineTr: "Özenle seçilen çekirdekler, günlük taze tatlılar ve günün her saatinde keyifli atmosfer.",
        taglineEn: "Carefully roasted beans, freshly baked treats, and a warm neighborhood atmosphere.",
        sectionTitleTr: "Öne Çıkan Menü",
        sectionTitleEn: "Featured Menu",
        ctaTr: "WhatsApp Sipariş & Bilgi",
        ctaEn: "Order via WhatsApp",
        ctaWaMsg: "Merhaba, menü ve sipariş hakkında bilgi alabilir miyim?",
        badgeTr: "QR Dijital Menü Hazır",
        badgeEn: "Digital QR Menu",
        heroLayout: "cozy-card",
      };
      break;

    case "atelier-beauty":
      spec = {
        isLight: true,
        bg: "#FAF5F2",
        surface: "#FFFFFF",
        surfaceAlt: "#F3E8E3",
        border: "rgba(38, 28, 30, 0.10)",
        text: "#261C1E",
        textMuted: "#6B5A5D",
        accent: "#B8786C",
        accentOn: "#FFFFFF",
        heroGrad: "linear-gradient(135deg, #D8B4A9 0%, #8A5E55 100%)",
        headingFont: "'Cormorant Garamond', Georgia, serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        eyebrowTr: "GÜZELLİK · BAKIM · ONLINE RANDEVU",
        eyebrowEn: "BEAUTY · CARE · ONLINE BOOKING",
        taglineTr: "Kişiye özel bakım uygulamaları, steril ortam ve uzman ekiple kendinize ayırdığınız en özel saat.",
        taglineEn: "Tailored beauty treatments, hygienic studio standards, and effortless WhatsApp appointments.",
        sectionTitleTr: "Uygulamalar & Bakım Listesi",
        sectionTitleEn: "Treatments & Services",
        ctaTr: "Online Randevu Al",
        ctaEn: "Book Appointment",
        ctaWaMsg: "Merhaba, randevu ve işlem bilgisi almak istiyorum.",
        badgeTr: "Aynı Gün Müsaitlik",
        badgeEn: "Same-Day Booking",
        heroLayout: "arch-spa",
      };
      break;

    case "coastal-club":
      spec = {
        isLight: false,
        bg: "#071824",
        surface: "#0D2434",
        surfaceAlt: "#133146",
        border: "rgba(224, 247, 250, 0.12)",
        text: "#F0FAFC",
        textMuted: "#98C1D4",
        accent: "#2DD4BF",
        accentOn: "#051A22",
        heroGrad: "linear-gradient(135deg, #0D647D 0%, #071824 100%)",
        headingFont: "'Syne', sans-serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        eyebrowTr: "AKDENİZ ROTALARI · TEKNE & AKTİVİTE",
        eyebrowEn: "MEDITERRANEAN TOURS & EXPERIENCES",
        taglineTr: "Antalya'nın en berrak koyları, güvenli transfer ve unutulmaz günlük deniz deneyimleri.",
        taglineEn: "Crystal-clear coves of Antalya, private boat tours, and reliable transfers.",
        sectionTitleTr: "Turlar & Programlar",
        sectionTitleEn: "Tours & Experiences",
        ctaTr: "WhatsApp Hızlı Rezervasyon",
        ctaEn: "Instant WhatsApp Booking",
        ctaWaMsg: "Merhaba, tur programı ve kişi başı fiyat bilgisi alabilir miyim?",
        badgeTr: "TR / EN Rehberlik",
        badgeEn: "TR / EN Guides",
        heroLayout: "coastal-banner",
      };
      break;

    case "modern-craft":
      spec = {
        isLight: false,
        bg: "#0E131B",
        surface: "#151C28",
        surfaceAlt: "#1D2636",
        border: "rgba(255, 255, 255, 0.10)",
        text: "#F8FAFC",
        textMuted: "#94A3B8",
        accent: "#F59E0B",
        accentOn: "#0E131B",
        heroGrad: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        headingFont: "'Plus Jakarta Sans', sans-serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
        eyebrowTr: "ANTALYA PROFESYONEL HİZMET",
        eyebrowEn: "ANTALYA PROFESSIONAL SERVICE",
        taglineTr: "Zamanında çözüm, şeffaf fiyatlandırma ve garantili hizmet anlayışıyla yanınızdayız.",
        taglineEn: "Fast response, transparent pricing, and reliable service across Antalya.",
        sectionTitleTr: "Hizmetlerimiz",
        sectionTitleEn: "Our Services",
        ctaTr: "WhatsApp'tan Hızlı Teklif Al",
        ctaEn: "Get Quick Quote",
        ctaWaMsg: "Merhaba, hizmetleriniz ve fiyat bilgisi hakkında görüşmek istiyorum.",
        badgeTr: "Hızlı Geri Dönüş",
        badgeEn: "Fast Response",
        heroLayout: "trust-clean",
      };
      break;

    case "aegean-tavern":
    default:
      spec = {
        isLight: false,
        bg: "#0B1520",
        surface: "#122030",
        surfaceAlt: "#1A2E44",
        border: "rgba(245, 239, 230, 0.11)",
        text: "#F5EFE6",
        textMuted: "#AEBFD1",
        accent: "#D98A4E",
        accentOn: "#0B1520",
        heroGrad: "linear-gradient(135deg, #1E3A54 0%, #0B1520 100%)",
        headingFont: "'Playfair Display', Georgia, serif",
        bodyFont: "'Plus Jakarta Sans', sans-serif",
        googleFontsUrl:
          "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
        eyebrowTr: "AKDENİZ SOFRASI · GÜNLÜK TAZE MEZELER",
        eyebrowEn: "MEDITERRANEAN TABLE · FRESH DAILY MEZE",
        taglineTr: "Günlük hazırlanan Ege ve Akdeniz mezeleri, taze deniz ürünleri ve keyifli akşam sofraları.",
        taglineEn: "Daily fresh Aegean & Mediterranean mezes, seafood, and warm evening hospitality.",
        sectionTitleTr: "Menüden Seçmeler",
        sectionTitleEn: "From Our Menu",
        ctaTr: "WhatsApp ile Masa Ayırt",
        ctaEn: "Reserve a Table",
        ctaWaMsg: "Merhaba, bu akşam için masa rezervasyonu yaptırmak istiyorum.",
        badgeTr: "Online Masa Rezervasyonu",
        badgeEn: "Table Reservation",
        heroLayout: "fullbleed",
      };
      break;
  }

  if (customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent)) {
    spec = {
      ...spec,
      accent: customAccent,
      accentOn: isHexLight(customAccent) ? "#0B0D10" : "#FFFFFF",
    };
  }
  return spec;
}

function getSiteItems(preset: Exclude<VenueDesignPreset, "auto">, category: string): SiteItem[] {
  const cat = toAsciiLower(category);
  if (preset === "aegean-tavern" || cat.includes("meyhane") || cat.includes("restoran") || cat.includes("balik")) {
    return [
      {
        nameTr: "Girit Ezmesi & Günlük Meze Tabağı",
        nameEn: "Cretan Dip & Daily Meze Platter",
        descTr: "Zeytinyağlı, mevsiminde günlük hazırlanan soğuk mezeler",
        descEn: "Fresh seasonal cold mezes prepared daily with olive oil",
        price: "320 TL",
      },
      {
        nameTr: "Izgara Levrek / Çipura",
        nameEn: "Grilled Sea Bass / Sea Bream",
        descTr: "Akdeniz yeşillikleri, közlenmiş biber ve limon sos ile",
        descEn: "Served with Mediterranean greens and roasted peppers",
        price: "640 TL",
      },
      {
        nameTr: "Kalamar Tava & Tarator",
        nameEn: "Crispy Calamari & Tarator",
        descTr: "Çıtır kalamar halkaları, ev yapımı cevizli tarator sos",
        descEn: "Golden fried calamari rings with homemade walnut tarator",
        price: "480 TL",
      },
      {
        nameTr: "Tahinli Kabak Tatlısı",
        nameEn: "Antalya Pumpkin Dessert",
        descTr: "Antalya usulü bol tahin ve kavrulmuş ceviz ile",
        descEn: "Traditional caramelized pumpkin with tahini & walnuts",
        price: "210 TL",
      },
    ];
  }

  if (preset === "boutique-stone") {
    return [
      {
        nameTr: "Deluxe Taş Oda (2 Kişilik)",
        nameEn: "Deluxe Stone Room (2 Guests)",
        descTr: "Serpme kahvaltı dahil · Klima · Yüksek hızlı Wi-Fi",
        descEn: "Breakfast included · Air conditioning · High-speed Wi-Fi",
        price: "3.800 TL",
      },
      {
        nameTr: "Avlu Manzaralı Süit",
        nameEn: "Courtyard View Suite",
        descTr: "Geniş oturma alanı, özel balkon ve geç çıkış imkanı",
        descEn: "Spacious lounge, private balcony, and late checkout option",
        price: "5.200 TL",
      },
      {
        nameTr: "Havalimanı Özel Transfer",
        nameEn: "Private Airport Transfer",
        descTr: "7/24 Antalya Havalimanı karşılama ve otele direkt ulaşım",
        descEn: "24/7 Antalya Airport pickup directly to our doorstep",
        price: "1.100 TL",
      },
      {
        nameTr: "Doğrudan WhatsApp Rezervasyonu",
        nameEn: "Direct WhatsApp Booking",
        descTr: "Aracı komisyonu olmadan en uygun oda fiyatı garantisi",
        descEn: "Commission-free direct booking with best rate guarantee",
        price: "%10 İndirim",
      },
    ];
  }

  if (preset === "atelier-beauty") {
    return [
      {
        nameTr: "Hydrafacial & Medikal Cilt Bakımı",
        nameEn: "Hydrafacial & Medical Skin Care",
        descTr: "60 dk · Cilt analizi, derin temizlik ve yenileyici maske",
        descEn: "60 min · Skin analysis, deep cleansing & renewing mask",
        price: "1.450 TL",
      },
      {
        nameTr: "Kalıcı Oje & Medikal Manikür",
        nameEn: "Gel Polish & Spa Manicure",
        descTr: "Steril ekipman · Geniş renk paleti · Uzun süre kalıcılık",
        descEn: "Sterilized tools · Wide shade palette · Long-lasting finish",
        price: "650 TL",
      },
      {
        nameTr: "İpek Kirpik & Kaş Laminasyon",
        nameEn: "Lash Extensions & Brow Lamination",
        descTr: "Yüz hattınıza uygun doğal ve belirgin tasarım",
        descEn: "Natural, custom-shaped framing tailored to your features",
        price: "1.100 TL",
      },
      {
        nameTr: "Profesyonel Saç & Bakım",
        nameEn: "Hair Styling & Keratin Care",
        descTr: "Kesim, fön ve onarıcı bakım protokolleri",
        descEn: "Precision cut, blowout & restorative hair treatments",
        price: "950 TL",
      },
    ];
  }

  if (preset === "coastal-club") {
    return [
      {
        nameTr: "Günlük Koylar Tekne Turu",
        nameEn: "Full-Day Bays Boat Tour",
        descTr: "Öğle yemeği, yüzme molaları ve rehberlik dahil",
        descEn: "Includes lunch, swimming stops, and local crew",
        price: "1.400 TL",
      },
      {
        nameTr: "Gün Batımı Özel Yat Kiralama",
        nameEn: "Private Sunset Yacht Charter",
        descTr: "Kaptan dahil · Aile ve arkadaş grupları için özel rota",
        descEn: "Captain included · Private route for families & groups",
        price: "9.500 TL",
      },
      {
        nameTr: "VIP Transfer Hizmeti",
        nameEn: "VIP Private Transfer",
        descTr: "Otelden limana ve havalimanına klimalı özel araç",
        descEn: "Air-conditioned private vehicle from hotel or airport",
        price: "1.100 TL",
      },
    ];
  }

  if (preset === "modern-craft") {
    return [
      {
        nameTr: "Ücretsiz Ön Görüşme & Keşif",
        nameEn: "Free Initial Consultation",
        descTr: "İhtiyacınızı dinleyip aynı gün net fiyat bilgisi sunuyoruz",
        descEn: "Clear assessment and same-day transparent quote",
        price: "Ücretsiz",
      },
      {
        nameTr: "Standart Hizmet & Bakım",
        nameEn: "Standard Service & Care",
        descTr: "Uzman ekip, kaliteli malzeme ve zamanında teslimat",
        descEn: "Experienced team, quality materials, on-time delivery",
        price: "Teklif Alın",
      },
      {
        nameTr: "Hızlı WhatsApp Destek",
        nameEn: "Quick WhatsApp Support",
        descTr: "Fotoğraf veya detay gönderin, 15 dakikada dönüş yapalım",
        descEn: "Send photos or details for a fast reply within 15 mins",
        price: "7/24",
      },
    ];
  }

  // Roastery / Cafe / Pastane
  return [
    {
      nameTr: "Signature Iced Latte",
      nameEn: "Signature Iced Latte",
      descTr: "Özel kavrum çift shot espresso ve soğuk süt uyumu",
      descEn: "House-roasted double espresso poured over cold milk",
      price: "165 TL",
    },
    {
      nameTr: "San Sebastian Cheesecake",
      nameEn: "San Sebastian Cheesecake",
      descTr: "Günlük taze pişirim, sıcak Belçika çikolatası ile",
      descEn: "Baked fresh daily, served with warm Belgian chocolate",
      price: "240 TL",
    },
    {
      nameTr: "Antalya Portakallı Kruvasan",
      nameEn: "Antalya Orange Croissant",
      descTr: "Kat kat tereyağlı hamur ve taze portakal kreması",
      descEn: "Flaky butter pastry filled with fresh local orange cream",
      price: "185 TL",
    },
    {
      nameTr: "Butik Pasta & Özel Sipariş",
      nameEn: "Custom Cakes & Special Orders",
      descTr: "Doğum günü ve özel günler için kişiye özel tasarım",
      descEn: "Custom-crafted cakes for birthdays and celebrations",
      price: "Siparişle",
    },
  ];
}

/**
 * Generates a complete, standalone, responsive, bilingual (TR/EN) `index.html` website
 * specifically tailored to the business's name, sector, ambiance, photo, colors, and contact info.
 */
export function generateBusinessIndexHtml(
  lead: Lead,
  overridePreset?: Exclude<VenueDesignPreset, "auto">
): string {
  const preset =
    overridePreset ||
    lead.design_preset ||
    detectVenuePreset(lead.category, lead.business_name, lead.description);

  const t = getSiteTheme(preset, lead.accent_color);
  const items = getSiteItems(preset, lead.category);

  const safeName = escapeHtml(lead.business_name);
  const safeCategory = escapeHtml(lead.category || "İşletme");
  const safeDistrict = escapeHtml(lead.district || "Antalya");
  const safeAddress = escapeHtml(lead.address || `${lead.district || "Antalya"}, Türkiye`);
  const safeHours = escapeHtml(lead.opening_hours || "Her gün 09:00 – 23:00");
  const safeDescTr = escapeHtml(lead.description || t.taglineTr);
  const safeDescEn = escapeHtml(t.taglineEn);

  const waHref = lead.phone
    ? `https://wa.me/${encodeURIComponent(lead.phone)}?text=${encodeURIComponent(t.ctaWaMsg)}`
    : "#iletisim";
  const telHref = lead.phone ? `tel:+${lead.phone}` : "#iletisim";
  const mapsHref =
    lead.google_maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lead.business_name} ${lead.district || "Antalya"}`
    )}`;

  const ratingHtml = lead.google_rating
    ? `<span class="badge-rating">★ ${lead.google_rating.toFixed(1)} · ${lead.reviews_count || 0} <span data-tr="Google yorumu" data-en="Google reviews">Google yorumu</span></span>`
    : `<span class="badge-rating">★ ${safeDistrict} · ${safeCategory}</span>`;

  const highlights =
    lead.highlights && lead.highlights.length > 0
      ? lead.highlights.slice(0, 4)
      : [lead.district || "Antalya", lead.category || "Yerel İşletme", t.badgeTr];

  const chipsHtml = highlights
    .map((h) => `<span class="chip">${escapeHtml(h)}</span>`)
    .join("");

  const itemsHtml = items
    .map(
      (item) => `
      <article class="menu-card">
        <div class="menu-card-bar"></div>
        <div class="menu-card-body">
          <div class="menu-card-top">
            <h3 data-tr="${escapeHtml(item.nameTr)}" data-en="${escapeHtml(item.nameEn)}">${escapeHtml(item.nameTr)}</h3>
            <span class="price">${escapeHtml(item.price)}</span>
          </div>
          <p data-tr="${escapeHtml(item.descTr)}" data-en="${escapeHtml(item.descEn)}">${escapeHtml(item.descTr)}</p>
        </div>
      </article>`
    )
    .join("\n");

  const hasPhoto = Boolean(lead.image_url && lead.image_url.trim());
  const safePhoto = hasPhoto ? escapeHtml(lead.image_url!) : "";

  const heroSectionHtml =
    t.heroLayout === "arch-spa"
      ? `
    <section class="hero hero-arch">
      <div class="hero-copy">
        <p class="eyebrow" data-tr="${escapeHtml(t.eyebrowTr)}" data-en="${escapeHtml(t.eyebrowEn)}">${escapeHtml(t.eyebrowTr)}</p>
        <h1>${safeName}</h1>
        <p class="lead-text" data-tr="${safeDescTr}" data-en="${safeDescEn}">${safeDescTr}</p>
        <div class="meta-row">${ratingHtml}</div>
        <div class="cta-row">
          <a class="btn-primary" href="${waHref}" target="_blank" rel="noopener" data-tr="${escapeHtml(t.ctaTr)}" data-en="${escapeHtml(t.ctaEn)}">${escapeHtml(t.ctaTr)}</a>
          <a class="btn-secondary" href="${mapsHref}" target="_blank" rel="noopener" data-tr="Yol Tarifi" data-en="Directions">Yol Tarifi</a>
        </div>
      </div>
      <div class="arch-media">
        ${hasPhoto ? `<img src="${safePhoto}" alt="${safeName}" />` : `<div class="media-fallback"><span>${safeName}</span></div>`}
      </div>
    </section>`
      : t.heroLayout === "editorial-split"
      ? `
    <section class="hero hero-split">
      <div class="split-copy">
        <p class="eyebrow" data-tr="${escapeHtml(t.eyebrowTr)}" data-en="${escapeHtml(t.eyebrowEn)}">${escapeHtml(t.eyebrowTr)}</p>
        <h1>${safeName}</h1>
        <p class="lead-text" data-tr="${safeDescTr}" data-en="${safeDescEn}">${safeDescTr}</p>
        <div class="meta-row">${ratingHtml}</div>
        <div class="cta-row">
          <a class="btn-primary" href="${waHref}" target="_blank" rel="noopener" data-tr="${escapeHtml(t.ctaTr)}" data-en="${escapeHtml(t.ctaEn)}">${escapeHtml(t.ctaTr)}</a>
          <a class="btn-secondary" href="${mapsHref}" target="_blank" rel="noopener" data-tr="Konum" data-en="Location">Konum</a>
        </div>
      </div>
      <div class="split-media">
        ${hasPhoto ? `<img src="${safePhoto}" alt="${safeName}" />` : `<div class="media-fallback"><span>${safeDistrict}</span></div>`}
      </div>
    </section>`
      : `
    <section class="hero hero-fullbleed">
      ${hasPhoto ? `<img class="hero-bg-img" src="${safePhoto}" alt="${safeName}" />` : ""}
      <div class="hero-scrim"></div>
      <div class="hero-inner">
        <div class="meta-row">${ratingHtml}</div>
        <p class="eyebrow" data-tr="${escapeHtml(t.eyebrowTr)}" data-en="${escapeHtml(t.eyebrowEn)}">${escapeHtml(t.eyebrowTr)}</p>
        <h1>${safeName}</h1>
        <p class="lead-text" data-tr="${safeDescTr}" data-en="${safeDescEn}">${safeDescTr}</p>
        <div class="cta-row">
          <a class="btn-primary" href="${waHref}" target="_blank" rel="noopener" data-tr="${escapeHtml(t.ctaTr)}" data-en="${escapeHtml(t.ctaEn)}">${escapeHtml(t.ctaTr)}</a>
          <a class="btn-secondary" href="${mapsHref}" target="_blank" rel="noopener" data-tr="Yol Tarifi" data-en="Directions">Yol Tarifi</a>
        </div>
      </div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — ${safeDistrict}, Antalya</title>
  <meta name="description" content="${safeName} (${safeDistrict}, Antalya) — ${safeDescTr}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${t.googleFontsUrl}" rel="stylesheet" />
  <style>
    :root {
      --bg: ${t.bg};
      --surface: ${t.surface};
      --surface-alt: ${t.surfaceAlt};
      --border: ${t.border};
      --text: ${t.text};
      --text-muted: ${t.textMuted};
      --accent: ${t.accent};
      --accent-on: ${t.accentOn};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: ${t.bodyFont};
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 980px; margin: 0 auto; padding: 0 20px; }

    /* Header */
    .topbar {
      position: sticky; top: 0; z-index: 30;
      backdrop-filter: blur(14px);
      background: ${t.isLight ? "rgba(250, 245, 240, 0.86)" : "rgba(10, 14, 20, 0.82)"};
      border-bottom: 1px solid var(--border);
    }
    .topbar-inner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; height: 64px;
    }
    .brand {
      font-family: ${t.headingFont};
      font-weight: 700; font-size: 1.2rem; letter-spacing: -0.01em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .top-actions { display: flex; align-items: center; gap: 10px; shrink: 0; }
    .lang-btn {
      background: var(--surface-alt); color: var(--text);
      border: 1px solid var(--border); border-radius: 999px;
      padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .top-call {
      background: var(--accent); color: var(--accent-on);
      border-radius: 999px; padding: 7px 14px; font-size: 12px; font-weight: 600;
    }

    /* Hero Layouts */
    .hero { margin: 24px 0 28px; border-radius: 26px; overflow: hidden; border: 1px solid var(--border); }
    .eyebrow {
      font-size: 11px; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--accent); margin-bottom: 10px;
    }
    h1 {
      font-family: ${t.headingFont};
      font-size: clamp(2rem, 5.2vw, 3.35rem);
      line-height: 1.08; letter-spacing: -0.02em; margin-bottom: 14px;
    }
    .lead-text { font-size: 0.98rem; color: var(--text-muted); max-width: 540px; margin-bottom: 18px; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .badge-rating {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 999px;
      background: var(--surface-alt); border: 1px solid var(--border);
      font-size: 13px; font-weight: 600; color: ${t.isLight ? "#9A5B13" : "#FBBF24"};
    }
    .cta-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .btn-primary {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 13px 22px; border-radius: 14px; font-weight: 700; font-size: 14px;
      background: var(--accent); color: var(--accent-on);
      transition: transform 150ms ease, filter 150ms ease;
    }
    .btn-primary:hover { transform: translateY(-1px); filter: brightness(1.06); }
    .btn-secondary {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 13px 20px; border-radius: 14px; font-weight: 600; font-size: 14px;
      background: var(--surface-alt); color: var(--text); border: 1px solid var(--border);
    }

    /* Fullbleed Hero */
    .hero-fullbleed {
      position: relative; min-height: 410px; display: flex; align-items: flex-end;
      background: ${t.heroGrad};
    }
    .hero-bg-img {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    }
    .hero-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(6,10,16,0.22) 0%, rgba(6,10,16,0.68) 52%, rgba(6,10,16,0.92) 100%);
    }
    .hero-inner { position: relative; z-index: 2; padding: 34px 26px; width: 100%; color: #FFFFFF; }
    .hero-inner .lead-text { color: rgba(255,255,255,0.84); }
    .hero-inner .badge-rating { background: rgba(10,14,20,0.65); border-color: rgba(255,255,255,0.18); }
    .hero-inner .btn-secondary { background: rgba(255,255,255,0.14); color: #fff; border-color: rgba(255,255,255,0.22); }

    /* Arch Spa & Editorial Split Hero */
    .hero-arch, .hero-split {
      background: var(--surface); display: grid;
      grid-template-columns: 1.15fr 0.85fr; gap: 24px; padding: 28px; align-items: center;
    }
    .arch-media {
      aspect-ratio: 4/5; border-radius: 180px 180px 24px 24px; overflow: hidden;
      border: 1px solid var(--border); background: ${t.heroGrad};
    }
    .split-media {
      aspect-ratio: 4/4.3; border-radius: 20px; overflow: hidden;
      border: 1px solid var(--border); background: ${t.heroGrad};
    }
    .arch-media img, .split-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .media-fallback {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      padding: 20px; text-align: center; color: #fff; font-family: ${t.headingFont};
      font-size: 1.6rem; font-style: italic;
    }

    /* Chips */
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 30px; }
    .chip {
      padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 500;
      background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);
    }

    /* Menu / Services */
    .section { margin-bottom: 36px; }
    .section-head {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 12px; padding-bottom: 14px; margin-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    .section-head h2 { font-family: ${t.headingFont}; font-size: 1.65rem; }
    .section-tag { font-size: 12px; color: var(--accent); font-weight: 600; }
    .menu-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .menu-card {
      display: flex; gap: 14px; padding: 18px; border-radius: 18px;
      background: var(--surface); border: 1px solid var(--border);
    }
    .menu-card-bar { width: 3px; border-radius: 3px; background: var(--accent); flex-shrink: 0; }
    .menu-card-body { flex: 1; min-width: 0; }
    .menu-card-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
    .menu-card h3 { font-size: 0.98rem; font-weight: 700; }
    .menu-card .price { font-size: 0.92rem; font-weight: 700; color: var(--accent); white-space: nowrap; }
    .menu-card p { margin-top: 6px; font-size: 0.85rem; color: var(--text-muted); }

    /* Contact Info Card */
    .info-box {
      display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; align-items: center;
      padding: 24px; border-radius: 22px;
      background: var(--surface); border: 1px solid var(--border);
    }
    .info-box h2 { font-family: ${t.headingFont}; font-size: 1.5rem; margin-bottom: 10px; }
    .info-line { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 6px; }
    .info-line strong { color: var(--text); }
    .info-actions { display: flex; flex-direction: column; gap: 10px; }

    footer {
      margin-top: 32px; padding: 24px 0 36px; border-top: 1px solid var(--border);
      text-align: center; font-size: 12px; color: var(--text-muted);
    }
    footer a { color: var(--accent); font-weight: 600; }

    @media (max-width: 720px) {
      .hero-arch, .hero-split, .menu-grid, .info-box { grid-template-columns: 1fr; }
      .hero-arch, .hero-split { padding: 20px; }
      .hero-fullbleed { min-height: 360px; }
      .hero-inner { padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="#">${safeName}</a>
      <div class="top-actions">
        <button id="langToggle" class="lang-btn" type="button">EN</button>
        <a class="top-call" href="${waHref}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  </header>

  <main class="container">
    ${heroSectionHtml}

    <div class="chips">${chipsHtml}</div>

    <section class="section" id="menu">
      <div class="section-head">
        <h2 data-tr="${escapeHtml(t.sectionTitleTr)}" data-en="${escapeHtml(t.sectionTitleEn)}">${escapeHtml(t.sectionTitleTr)}</h2>
        <span class="section-tag" data-tr="${escapeHtml(t.badgeTr)}" data-en="${escapeHtml(t.badgeEn)}">${escapeHtml(t.badgeTr)}</span>
      </div>
      <div class="menu-grid">
        ${itemsHtml}
      </div>
    </section>

    <section class="section" id="iletisim">
      <div class="info-box">
        <div>
          <h2 data-tr="İletişim &amp; Konum" data-en="Contact &amp; Location">İletişim &amp; Konum</h2>
          <p class="info-line"><strong data-tr="Adres:" data-en="Address:">Adres:</strong> ${safeAddress}</p>
          <p class="info-line"><strong data-tr="Çalışma Saatleri:" data-en="Hours:">Çalışma Saatleri:</strong> ${safeHours}</p>
          ${lead.phone ? `<p class="info-line"><strong data-tr="Telefon:" data-en="Phone:">Telefon:</strong> <a href="${telHref}">+${lead.phone}</a></p>` : ""}
        </div>
        <div class="info-actions">
          <a class="btn-primary" href="${waHref}" target="_blank" rel="noopener" data-tr="${escapeHtml(t.ctaTr)}" data-en="${escapeHtml(t.ctaEn)}">${escapeHtml(t.ctaTr)}</a>
          <a class="btn-secondary" href="${mapsHref}" target="_blank" rel="noopener" data-tr="Google Haritalar'da Aç" data-en="Open in Google Maps">Google Haritalar'da Aç</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="container">
      <p>${safeName} · ${safeDistrict}, Antalya</p>
      <p style="margin-top:6px;">
        <span data-tr="Örnek web sitesi taslağı" data-en="Sample website preview by">Örnek web sitesi taslağı</span> ·
        <a href="https://likyastudios.live" target="_blank" rel="noopener">Likya Studios</a> (@likyastudios)
      </p>
    </div>
  </footer>

  <script>
    (function () {
      var lang = "tr";
      var btn = document.getElementById("langToggle");
      btn.addEventListener("click", function () {
        lang = lang === "tr" ? "en" : "tr";
        document.documentElement.lang = lang;
        btn.textContent = lang === "tr" ? "EN" : "TR";
        document.querySelectorAll("[data-tr][data-en]").forEach(function (el) {
          el.textContent = el.getAttribute("data-" + lang);
        });
      });
    })();
  </script>
</body>
</html>
`;
}

export function downloadBusinessHtml(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openBusinessHtmlInNewTab(htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}
