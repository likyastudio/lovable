import QRCode from "qrcode";
import type { Lead, VenueDesignPreset } from "../types";
import { detectVenuePreset } from "./apify";
import { toAsciiLower } from "./phone";

interface MenuItem {
  title: string;
  desc: string;
  price: string;
}

interface VenuePalette {
  isLight: boolean;
  outerBg: string;
  chassisBg: string;
  chassisBorder: string;
  cardBg: string;
  cardBorder: string;
  pillBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentOnFill: string;
  waBg: string;
  waText: string;
  secBtnBg: string;
  secBtnText: string;
  notchBg: string;
  heroGradStart: string;
  heroGradEnd: string;
  heroPatternColor: string;
  qrDark: string;
  sectionTitle: string;
  ctaLabel: string;
  taglineFallback: string;
  layoutStyle: "fullbleed" | "arch-editorial" | "cozy-banner" | "minimal-spa" | "coastal" | "service-trust";
}

function getVenuePalette(
  preset: Exclude<VenueDesignPreset, "auto">,
  customAccent?: string
): VenuePalette {
  let base: VenuePalette;

  switch (preset) {
    case "boutique-stone":
      base = {
        isLight: true,
        outerBg: "#E6DDD0",
        chassisBg: "#F3ECE1",
        chassisBorder: "#C8BBA8",
        cardBg: "#FAF6EE",
        cardBorder: "rgba(28, 24, 20, 0.13)",
        pillBg: "#E8DFD1",
        textPrimary: "#1C1814",
        textSecondary: "#574E45",
        textMuted: "#7E7469",
        accent: "#8B5E3C",
        accentText: "#7C4F2F",
        accentOnFill: "#FAF6EE",
        waBg: "#2E6F4E",
        waText: "#FFFFFF",
        secBtnBg: "#E8DFD1",
        secBtnText: "#1C1814",
        notchBg: "#1C1814",
        heroGradStart: "#4A3A2C",
        heroGradEnd: "#221A14",
        heroPatternColor: "rgba(214, 186, 152, 0.18)",
        qrDark: "#1C1814",
        sectionTitle: "Odalar & Doğrudan Rezervasyon",
        ctaLabel: "WhatsApp Rezervasyon",
        taglineFallback: "Doğrudan rezervasyon · En iyi fiyat garantisi",
        layoutStyle: "arch-editorial",
      };
      break;

    case "roastery-warm":
      base = {
        isLight: false,
        outerBg: "#0D0A09",
        chassisBg: "#16110F",
        chassisBorder: "#3A2C24",
        cardBg: "#201915",
        cardBorder: "rgba(246, 239, 230, 0.10)",
        pillBg: "#2B211C",
        textPrimary: "#F6EFE6",
        textSecondary: "#C2B4A6",
        textMuted: "#87796C",
        accent: "#D89B58",
        accentText: "#E4AC6D",
        accentOnFill: "#16110F",
        waBg: "#10B981",
        waText: "#042117",
        secBtnBg: "#2C221D",
        secBtnText: "#F6EFE6",
        notchBg: "#090706",
        heroGradStart: "#5C3A21",
        heroGradEnd: "#16110F",
        heroPatternColor: "rgba(216, 155, 88, 0.16)",
        qrDark: "#16110F",
        sectionTitle: "Özel Kahveler & Fırından",
        ctaLabel: "WhatsApp Sipariş / Bilgi",
        taglineFallback: "Günlük taze kavrum & el yapımı lezzetler",
        layoutStyle: "cozy-banner",
      };
      break;

    case "atelier-beauty":
      base = {
        isLight: true,
        outerBg: "#EFE6E2",
        chassisBg: "#FAF5F2",
        chassisBorder: "#DBC8C0",
        cardBg: "#FFFFFF",
        cardBorder: "rgba(37, 29, 30, 0.10)",
        pillBg: "#F2E6E1",
        textPrimary: "#251D1E",
        textSecondary: "#635355",
        textMuted: "#8F7E80",
        accent: "#B8786C",
        accentText: "#9E5D52",
        accentOnFill: "#FFFFFF",
        waBg: "#251D1E",
        waText: "#FAF5F2",
        secBtnBg: "#F2E6E1",
        secBtnText: "#251D1E",
        notchBg: "#251D1E",
        heroGradStart: "#D4ABA0",
        heroGradEnd: "#7E564E",
        heroPatternColor: "rgba(255, 255, 255, 0.25)",
        qrDark: "#251D1E",
        sectionTitle: "Bakım & Randevu Listesi",
        ctaLabel: "WhatsApp Hızlı Randevu",
        taglineFallback: "Kişiye özel bakım protokolleri · Steril ortam",
        layoutStyle: "minimal-spa",
      };
      break;

    case "coastal-club":
      base = {
        isLight: false,
        outerBg: "#04111A",
        chassisBg: "#071A26",
        chassisBorder: "#183A4E",
        cardBg: "#0C2434",
        cardBorder: "rgba(224, 247, 250, 0.12)",
        pillBg: "#123247",
        textPrimary: "#F0FAFC",
        textSecondary: "#9CC5D6",
        textMuted: "#648FA3",
        accent: "#2DD4BF",
        accentText: "#5EEAD4",
        accentOnFill: "#041A22",
        waBg: "#2DD4BF",
        waText: "#041E24",
        secBtnBg: "#123247",
        secBtnText: "#F0FAFC",
        notchBg: "#030B10",
        heroGradStart: "#0E6B82",
        heroGradEnd: "#071A26",
        heroPatternColor: "rgba(45, 212, 191, 0.18)",
        qrDark: "#071A26",
        sectionTitle: "Turlar, Aktiviteler & Program",
        ctaLabel: "WhatsApp Hızlı Rezervasyon",
        taglineFallback: "Akdeniz'in en özel rotaları · TR / EN / RU",
        layoutStyle: "coastal",
      };
      break;

    case "modern-craft":
      base = {
        isLight: false,
        outerBg: "#090C12",
        chassisBg: "#11161F",
        chassisBorder: "#2A3446",
        cardBg: "#171E2A",
        cardBorder: "rgba(255, 255, 255, 0.10)",
        pillBg: "#212A3A",
        textPrimary: "#F8FAFC",
        textSecondary: "#94A3B8",
        textMuted: "#64748B",
        accent: "#F59E0B",
        accentText: "#FBBF24",
        accentOnFill: "#0F131A",
        waBg: "#10B981",
        waText: "#042117",
        secBtnBg: "#212A3A",
        secBtnText: "#F8FAFC",
        notchBg: "#07090D",
        heroGradStart: "#1E293B",
        heroGradEnd: "#0F172A",
        heroPatternColor: "rgba(245, 158, 11, 0.14)",
        qrDark: "#0F172A",
        sectionTitle: "Hizmetlerimiz & Hızlı Teklif",
        ctaLabel: "WhatsApp Teklif / Servis",
        taglineFallback: "Antalya geneli hızlı, garantili ve şeffaf hizmet",
        layoutStyle: "service-trust",
      };
      break;

    case "aegean-tavern":
    default:
      base = {
        isLight: false,
        outerBg: "#070F18",
        chassisBg: "#0B1622",
        chassisBorder: "#22364C",
        cardBg: "#112030",
        cardBorder: "rgba(245, 239, 230, 0.11)",
        pillBg: "#1A2E44",
        textPrimary: "#F5EFE6",
        textSecondary: "#B4C2D1",
        textMuted: "#73889E",
        accent: "#D98A4E",
        accentText: "#E8A36D",
        accentOnFill: "#0B1622",
        waBg: "#10B981",
        waText: "#042117",
        secBtnBg: "#1A2E44",
        secBtnText: "#F5EFE6",
        notchBg: "#050A10",
        heroGradStart: "#1F3B57",
        heroGradEnd: "#0B1622",
        heroPatternColor: "rgba(217, 138, 78, 0.16)",
        qrDark: "#0B1622",
        sectionTitle: "Meze & Akşam Menüsü",
        ctaLabel: "WhatsApp Masa Ayırt",
        taglineFallback: "Akdeniz sofrası · Günlük taze mezeler & sıcak atmosfer",
        layoutStyle: "fullbleed",
      };
      break;
  }

  if (customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent)) {
    base = {
      ...base,
      accent: customAccent,
      accentText: customAccent,
      accentOnFill: isHexBright(customAccent) ? "#0B0D10" : "#FFFFFF",
    };
  }
  return base;
}

function isHexBright(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145;
}

function getSampleItems(preset: Exclude<VenueDesignPreset, "auto">, category: string): MenuItem[] {
  const cat = toAsciiLower(category);
  if (preset === "aegean-tavern" || cat.includes("meyhane") || cat.includes("restoran") || cat.includes("balik")) {
    return [
      { title: "Girit Ezmesi & Meze Tabağı", desc: "Zeytinyağlı günlük taze mezeler", price: "320 TL" },
      { title: "Izgara Levrek / Çipura", desc: "Akdeniz yeşillikleri & limon sos", price: "640 TL" },
      { title: "Kalamar Tava", desc: "Özel ev yapımı tarator sos ile", price: "480 TL" },
    ];
  }
  if (preset === "boutique-stone") {
    return [
      { title: "Deluxe Taş Oda (2 Kişi)", desc: "Serpme kahvaltı dahil · Klima · Wi-Fi", price: "3.800 TL" },
      { title: "Avlu Manzaralı Süit", desc: "Özel balkon · Geç çıkış imkanı", price: "5.200 TL" },
      { title: "Direkt WhatsApp Rezervasyon", desc: "Aracısız, komisyonsuz en iyi fiyat", price: "%10 İndirim" },
    ];
  }
  if (preset === "atelier-beauty") {
    return [
      { title: "Hydrafacial & Cilt Bakımı", desc: "60 dk · Kişiye özel analiz & maske", price: "1.450 TL" },
      { title: "Profesyonel Saç & Şekillendirme", desc: "Kesim, keratin bakım & fön", price: "950 TL" },
      { title: "Kalıcı Oje & Manikür", desc: "Steril ekipman · Hızlı randevu", price: "650 TL" },
    ];
  }
  if (preset === "coastal-club") {
    return [
      { title: "Günlük Koylar Tekne Turu", desc: "Öğle yemeği & ekipman dahil · TR/EN", price: "1.400 TL" },
      { title: "Gün Batımı Özel Yat Kiralama", desc: "Kaptan dahil · Maks. 8 kişi", price: "9.500 TL" },
      { title: "VIP Havalimanı Transferi", desc: "7/24 klimalı özel araç karşılama", price: "1.100 TL" },
    ];
  }
  if (preset === "modern-craft") {
    return [
      { title: "Yerinde Ücretsiz Keşif & Fiyat", desc: "Aynı gün Antalya içi hızlı servis", price: "Ücretsiz" },
      { title: "Periyodik Bakım & Onarım", desc: "Garantili işçilik · Şeffaf fatura", price: "Teklif Alın" },
      { title: "Acil WhatsApp Destek Hattı", desc: "Fotoğraf atın, 10 dk'da net fiyat alın", price: "7/24" },
    ];
  }
  return [
    { title: "Signature Iced Latte", desc: "Özel kavrum espresso · Soğuk süt", price: "165 TL" },
    { title: "San Sebastian Cheesecake", desc: "Belçika çikolata soslu · Günlük", price: "240 TL" },
    { title: "Antalya Portakallı Kruvasan", desc: "Taş fırından her sabah taze", price: "185 TL" },
  ];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawArchRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bottomR = 20
) {
  const topR = Math.min(w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + topR);
  ctx.arcTo(x, y, x + w / 2, y, topR);
  ctx.arcTo(x + w, y, x + w, y + topR, topR);
  ctx.lineTo(x + w, y + h - bottomR);
  ctx.arcTo(x + w, y + h, x + w - bottomR, y + h, bottomR);
  ctx.lineTo(x + bottomR, y + h);
  ctx.arcTo(x, y + h, x, y + h - bottomR, bottomR);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : [text];
}

function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  if (!src || !src.trim()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Extract a harmonious dominant brand accent hex color from an uploaded or CORS-enabled venue image.
 */
export async function extractAccentColorFromImage(imageUrl: string): Promise<string | null> {
  const img = await loadImageSafe(imageUrl);
  if (!img) return null;
  try {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 32, 32);
    const { data } = ctx.getImageData(0, 0, 32, 32);

    let bestScore = -1;
    let bestR = 212,
      bestG = 168,
      bestB = 83;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      if (a < 180) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (max + min) / 2;
      const sat = max === min ? 0 : (max - min) / (lum > 127 ? 510 - max - min : max + min);
      // Prefer vibrant mid-luminance tones suitable for UI accents
      if (lum < 48 || lum > 225) continue;
      const score = sat * (1 - Math.abs(lum - 135) / 140);
      if (score > bestScore) {
        bestScore = score;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }

    if (bestScore < 0.14) return null;
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(bestR)}${toHex(bestG)}${toHex(bestB)}`;
  } catch {
    return null;
  }
}

/**
 * Draw bespoke atmospheric venue art when no photo is loaded (so each sector looks uniquely designed).
 */
function drawAtmosphericBackdrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: VenuePalette
) {
  const grad = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  grad.addColorStop(0, p.heroGradStart);
  grad.addColorStop(1, p.heroGradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Subtle ambient glow orb
  const rad = ctx.createRadialGradient(
    x + w * 0.78,
    y + h * 0.25,
    12,
    x + w * 0.78,
    y + h * 0.25,
    w * 0.65
  );
  rad.addColorStop(0, p.heroPatternColor);
  rad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rad;
  ctx.fillRect(x, y, w, h);

  // Architectural geometric motif matched to layout style
  ctx.save();
  ctx.strokeStyle = p.heroPatternColor;
  ctx.lineWidth = 1.5;
  if (p.layoutStyle === "arch-editorial" || p.layoutStyle === "minimal-spa") {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + w * 0.8, y + h * 0.6, 55 + i * 32, Math.PI, 0);
      ctx.stroke();
    }
  } else if (p.layoutStyle === "coastal") {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const wy = y + h * 0.52 + i * 22;
      ctx.moveTo(x, wy);
      ctx.bezierCurveTo(x + w * 0.3, wy - 20, x + w * 0.65, wy + 20, x + w, wy - 8);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(x + w * 0.85, y + h * 0.2, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w * 0.85, y + h * 0.2, 130, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Render a 720x1280 bespoke Mobile Website Mockup PNG adapted to the business's photo, content, and ambiance.
 */
export async function renderMobileMockupDataUrl(
  lead: Lead,
  overridePreset?: Exclude<VenueDesignPreset, "auto">
): Promise<string> {
  const preset =
    overridePreset ||
    lead.design_preset ||
    detectVenuePreset(lead.category, lead.business_name, lead.description);

  const venueImg = await loadImageSafe(lead.image_url);
  const p = getVenuePalette(preset, lead.accent_color);

  const W = 720;
  const H = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Outer canvas
  ctx.fillStyle = p.outerBg;
  ctx.fillRect(0, 0, W, H);

  // Phone Chassis
  drawRoundedRect(ctx, 44, 32, W - 88, H - 64, 54);
  ctx.fillStyle = p.chassisBg;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = p.chassisBorder;
  ctx.stroke();

  // Dynamic Island Notch
  drawRoundedRect(ctx, W / 2 - 70, 54, 140, 26, 13);
  ctx.fillStyle = p.notchBg;
  ctx.fill();

  // Top Nav Bar
  ctx.font = "600 14px 'JetBrains Mono', monospace";
  ctx.fillStyle = p.accentText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${(lead.district || "ANTALYA").toUpperCase()} · ${(lead.category || "İŞLETME").toUpperCase()}`.slice(0, 34),
    78,
    114
  );

  drawRoundedRect(ctx, W - 180, 98, 102, 32, 12);
  ctx.fillStyle = p.pillBg;
  ctx.fill();
  ctx.fillStyle = p.textPrimary;
  ctx.textAlign = "center";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillText(preset === "coastal-club" ? "TR | EN | RU" : "TR  |  EN", W - 129, 115);

  // --- HERO BLOCK (Adapted to Venue Layout Style + Real Photo) ---
  const heroX = 76;
  const heroY = 148;
  const heroW = W - 152;
  const heroH = 330;

  ctx.save();
  if (p.layoutStyle === "minimal-spa") {
    // Soft arch framed hero photo on right, editorial text on left inside card
    drawRoundedRect(ctx, heroX, heroY, heroW, heroH, 28);
    ctx.fillStyle = p.cardBg;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = p.cardBorder;
    ctx.stroke();

    // Arch photo on right side
    ctx.save();
    drawArchRect(ctx, heroX + heroW - 216, heroY + 24, 192, 232, 18);
    ctx.clip();
    if (venueImg) {
      drawImageCover(ctx, venueImg, heroX + heroW - 216, heroY + 24, 192, 232);
    } else {
      drawAtmosphericBackdrop(ctx, heroX + heroW - 216, heroY + 24, 192, 232, p);
    }
    ctx.restore();

    // Left text
    ctx.textAlign = "left";
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.accentText;
    ctx.fillText("ÖZEL RANDEVU & BAKIM", heroX + 26, heroY + 46);

    ctx.font = "700 32px 'Playfair Display', Georgia, serif";
    ctx.fillStyle = p.textPrimary;
    const tLines = wrapText(ctx, lead.business_name, heroW - 260, 2);
    let ly = heroY + 90;
    for (const ln of tLines) {
      ctx.fillText(ln, heroX + 26, ly);
      ly += 38;
    }

    ctx.font = "400 15px 'Inter', sans-serif";
    ctx.fillStyle = p.textSecondary;
    const dLines = wrapText(ctx, lead.description || p.taglineFallback, heroW - 260, 2);
    let dy = ly + 10;
    for (const ln of dLines) {
      ctx.fillText(ln, heroX + 26, dy);
      dy += 22;
    }

    // Rating
    const ratingStr = lead.google_rating ? `★ ${lead.google_rating.toFixed(1)} (${lead.reviews_count})` : "★ 4.9 Antalya";
    drawRoundedRect(ctx, heroX + 26, heroY + 216, 185, 34, 10);
    ctx.fillStyle = p.pillBg;
    ctx.fill();
    ctx.font = "600 14px 'Inter', sans-serif";
    ctx.fillStyle = p.accentText;
    ctx.fillText(ratingStr, heroX + 40, heroY + 234);

    // Bottom hero CTA
    drawRoundedRect(ctx, heroX + 24, heroY + 268, heroW - 48, 44, 14);
    ctx.fillStyle = p.waBg;
    ctx.fill();
    ctx.fillStyle = p.waText;
    ctx.textAlign = "center";
    ctx.font = "600 16px 'Inter Tight', sans-serif";
    ctx.fillText(p.ctaLabel, heroX + heroW / 2, heroY + 291);
  } else {
    // Full-bleed Photo Hero with cinematic gradient scrim
    drawRoundedRect(ctx, heroX, heroY, heroW, heroH, 28);
    ctx.clip();

    if (venueImg) {
      drawImageCover(ctx, venueImg, heroX, heroY, heroW, heroH);
      // Editorial contrast scrim over photo
      const scrim = ctx.createLinearGradient(heroX, heroY, heroX, heroY + heroH);
      scrim.addColorStop(0, "rgba(7, 10, 15, 0.25)");
      scrim.addColorStop(0.45, "rgba(7, 10, 15, 0.58)");
      scrim.addColorStop(1, "rgba(7, 10, 15, 0.92)");
      ctx.fillStyle = scrim;
      ctx.fillRect(heroX, heroY, heroW, heroH);
    } else {
      drawAtmosphericBackdrop(ctx, heroX, heroY, heroW, heroH, p);
    }

    // Top badge over hero
    const ratingBadgeText = lead.google_rating
      ? `★ ${lead.google_rating.toFixed(1)} · ${lead.reviews_count} Google yorumu`
      : `★ ${lead.district || "Antalya"} Seçkin Mekan`;
    drawRoundedRect(ctx, heroX + 24, heroY + 22, 265, 34, 17);
    ctx.fillStyle = "rgba(10, 12, 16, 0.65)";
    ctx.fill();
    ctx.textAlign = "left";
    ctx.font = "600 14px 'Inter', sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText(ratingBadgeText, heroX + 40, heroY + 40);

    // Business Title over Hero
    ctx.font =
      p.layoutStyle === "arch-editorial"
        ? "italic 600 38px 'Playfair Display', Georgia, serif"
        : "700 36px 'Playfair Display', Georgia, serif";
    ctx.fillStyle = "#FFFFFF";
    const tLines = wrapText(ctx, lead.business_name, heroW - 48, 2);
    let ty = tLines.length === 1 ? heroY + 138 : heroY + 114;
    for (const ln of tLines) {
      ctx.fillText(ln, heroX + 24, ty);
      ty += 44;
    }

    // Venue real description / tagline
    ctx.font = "400 15px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(244, 240, 230, 0.85)";
    const descLines = wrapText(ctx, lead.description || p.taglineFallback, heroW - 48, 2);
    let dy = ty + 6;
    for (const ln of descLines) {
      ctx.fillText(ln, heroX + 24, dy);
      dy += 22;
    }

    // Hero Action Buttons
    drawRoundedRect(ctx, heroX + 24, heroY + heroH - 66, 304, 46, 14);
    ctx.fillStyle = p.waBg;
    ctx.fill();
    ctx.fillStyle = p.waText;
    ctx.textAlign = "center";
    ctx.font = "700 16px 'Inter Tight', sans-serif";
    ctx.fillText(p.ctaLabel, heroX + 24 + 152, heroY + heroH - 42);

    drawRoundedRect(ctx, heroX + 340, heroY + heroH - 66, heroW - 364, 46, 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 15px 'Inter Tight', sans-serif";
    ctx.fillText("Yol Tarifi", heroX + 340 + (heroW - 364) / 2, heroY + heroH - 42);
  }
  ctx.restore();

  // --- REAL VENUE HIGHLIGHTS CHIPS ---
  const chips =
    lead.highlights && lead.highlights.length > 0
      ? lead.highlights.slice(0, 3)
      : [lead.district || "Antalya", lead.category || "Özel Mekan", "TR / EN QR Menü"];

  let chipX = 76;
  const chipY = 496;
  ctx.font = "500 14px 'Inter', sans-serif";
  for (const chip of chips) {
    const label = chip.slice(0, 22);
    const tw = ctx.measureText(label).width + 28;
    if (chipX + tw > W - 76) break;
    drawRoundedRect(ctx, chipX, chipY, tw, 34, 17);
    ctx.fillStyle = p.pillBg;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.cardBorder;
    ctx.stroke();
    ctx.fillStyle = p.accentText;
    ctx.textAlign = "center";
    ctx.fillText(label, chipX + tw / 2, chipY + 18);
    chipX += tw + 10;
  }

  // --- SECTOR MENU / SERVICES SECTION ---
  ctx.textAlign = "left";
  ctx.font = "700 20px 'Inter Tight', sans-serif";
  ctx.fillStyle = p.textPrimary;
  ctx.fillText(p.sectionTitle, 78, 566);

  ctx.beginPath();
  ctx.moveTo(78, 590);
  ctx.lineTo(W - 78, 590);
  ctx.strokeStyle = p.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const items = getSampleItems(preset, lead.category);
  let cy = 610;
  for (const item of items) {
    drawRoundedRect(ctx, 76, cy, W - 152, 108, 20);
    ctx.fillStyle = p.cardBg;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.cardBorder;
    ctx.stroke();

    // Accent dot/bar on left
    drawRoundedRect(ctx, 94, cy + 28, 4, 52, 2);
    ctx.fillStyle = p.accent;
    ctx.fill();

    ctx.textAlign = "left";
    ctx.font = "600 19px 'Inter Tight', sans-serif";
    ctx.fillStyle = p.textPrimary;
    ctx.fillText(item.title, 114, cy + 38);

    ctx.font = "400 15px 'Inter', sans-serif";
    ctx.fillStyle = p.textSecondary;
    ctx.fillText(item.desc, 114, cy + 70);

    ctx.textAlign = "right";
    ctx.font = "700 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.accentText;
    ctx.fillText(item.price, W - 100, cy + 54);

    cy += 124;
  }

  // --- FOOTER INFO CARD (REAL HOURS & ADDRESS) ---
  drawRoundedRect(ctx, 76, 998, W - 152, 174, 22);
  ctx.fillStyle = p.cardBg;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = p.cardBorder;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = "600 15px 'Inter', sans-serif";
  ctx.fillStyle = p.textPrimary;
  ctx.fillText(
    `Çalışma Saatleri: ${(lead.opening_hours || "Her gün 09:00 – 23:30").slice(0, 40)}`,
    102,
    1036
  );

  ctx.font = "400 14px 'Inter', sans-serif";
  ctx.fillStyle = p.textSecondary;
  const addrLines = wrapText(
    ctx,
    `Adres: ${lead.address || `${lead.district || "Antalya"}, Türkiye`}`,
    W - 204,
    2
  );
  let ay = 1070;
  for (const ln of addrLines) {
    ctx.fillText(ln, 102, ay);
    ay += 22;
  }

  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = p.accentText;
  ctx.fillText("LIKYA STUDIOS · likyastudios.live · 0545 776 05 57", 102, 1142);

  // Home indicator bar
  drawRoundedRect(ctx, W / 2 - 74, H - 58, 148, 7, 4);
  ctx.fillStyle = p.textMuted;
  ctx.fill();

  return canvas.toDataURL("image/png");
}

/**
 * Render a 720x960 printable QR Menu Card PNG matching the venue's ambiance & photo banner.
 */
export async function renderQrCardDataUrl(
  lead: Lead,
  qrTargetUrl = "https://likyastudios.live/isletmeler",
  overridePreset?: Exclude<VenueDesignPreset, "auto">
): Promise<string> {
  const preset =
    overridePreset ||
    lead.design_preset ||
    detectVenuePreset(lead.category, lead.business_name, lead.description);

  const venueImg = await loadImageSafe(lead.image_url);
  const p = getVenuePalette(preset, lead.accent_color);

  const W = 720;
  const H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = p.outerBg;
  ctx.fillRect(0, 0, W, H);

  // Card Frame
  drawRoundedRect(ctx, 28, 28, W - 56, H - 56, 36);
  ctx.fillStyle = p.chassisBg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.chassisBorder;
  ctx.stroke();

  // Top atmospheric / venue photo header strip
  ctx.save();
  drawRoundedRect(ctx, 56, 56, W - 112, 224, 24);
  ctx.clip();
  if (venueImg) {
    drawImageCover(ctx, venueImg, 56, 56, W - 112, 224);
    const scrim = ctx.createLinearGradient(56, 56, 56, 280);
    scrim.addColorStop(0, "rgba(8,10,14,0.35)");
    scrim.addColorStop(1, "rgba(8,10,14,0.88)");
    ctx.fillStyle = scrim;
    ctx.fillRect(56, 56, W - 112, 224);
  } else {
    drawAtmosphericBackdrop(ctx, 56, 56, W - 112, 224, p);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillStyle = p.isLight && !venueImg ? "#FAF6EE" : p.accentText;
  ctx.fillText(
    `${(lead.district || "ANTALYA").toUpperCase()}  ·  ${(lead.category || "İŞLETME").toUpperCase()}`,
    W / 2,
    102
  );

  ctx.font = "700 40px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#FFFFFF";
  const lines = wrapText(ctx, lead.business_name, W - 170, 2);
  let y = lines.length === 1 ? 174 : 156;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 46;
  }

  ctx.font = "400 17px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Dijital Menü & Hızlı Bilgi · TR / EN", W / 2, 248);
  ctx.restore();

  // Real scannable QR code
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, qrTargetUrl || "https://likyastudios.live/isletmeler", {
    width: 344,
    margin: 2,
    color: {
      dark: p.qrDark,
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });

  const qrBox = 384;
  const qrX = (W - qrBox) / 2;
  const qrY = 318;
  drawRoundedRect(ctx, qrX, qrY, qrBox, qrBox, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = p.cardBorder;
  ctx.stroke();
  ctx.drawImage(qrCanvas, qrX + 20, qrY + 20, 344, 344);

  // Bottom CTA Pill
  drawRoundedRect(ctx, 92, 740, W - 184, 66, 18);
  ctx.fillStyle = p.accent;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.font = "700 21px 'Inter Tight', sans-serif";
  ctx.fillStyle = p.accentOnFill;
  ctx.fillText("Kameranızla Okutun · Scan Menu", W / 2, 773);

  // Footer
  ctx.font = "400 15px 'Inter', sans-serif";
  ctx.fillStyle = p.textMuted;
  ctx.fillText("LIKYA STUDIOS · Antalya Dijital Vitrin Taslağı", W / 2, 852);

  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillStyle = p.textSecondary;
  ctx.fillText("likyastudios.live  ·  0545 776 05 57", W / 2, 884);

  return canvas.toDataURL("image/png");
}

export async function copyDataUrlToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
