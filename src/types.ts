export type LeadStatus =
  | "Yeni"
  | "Görsel Hazır"
  | "Mesaj Atıldı"
  | "Görüşülüyor"
  | "Satış Kapandı"
  | "İstemiyor";

export const VALID_STATUSES: LeadStatus[] = [
  "Yeni",
  "Görsel Hazır",
  "Mesaj Atıldı",
  "Görüşülüyor",
  "Satış Kapandı",
  "İstemiyor",
];

export type VenueDesignPreset =
  | "auto"
  | "aegean-tavern"
  | "boutique-stone"
  | "roastery-warm"
  | "atelier-beauty"
  | "coastal-club"
  | "modern-craft";

export const VENUE_DESIGN_OPTIONS: {
  id: Exclude<VenueDesignPreset, "auto">;
  label: string;
  shortLabel: string;
  vibe: string;
  swatch: string;
}[] = [
  {
    id: "aegean-tavern",
    label: "Ege & Meyhane",
    shortLabel: "Meyhane",
    vibe: "Gece mavisi · Bakır & sıcak akşam",
    swatch: "#D98A4E",
  },
  {
    id: "boutique-stone",
    label: "Butik Taş Otel",
    shortLabel: "Butik Otel",
    vibe: "Kireçtaşı kâğıt · Dergi editoryal",
    swatch: "#8B5E3C",
  },
  {
    id: "roastery-warm",
    label: "Artisan Kafe",
    shortLabel: "Kafe",
    vibe: "Kavruk espresso · Karamel & krema",
    swatch: "#D89B58",
  },
  {
    id: "atelier-beauty",
    label: "Güzellik & Spa",
    shortLabel: "Güzellik",
    vibe: "Yumuşak pudra · Şampanya & kemer",
    swatch: "#C28B7E",
  },
  {
    id: "coastal-club",
    label: "Sahil & Tur",
    shortLabel: "Sahil / Tur",
    vibe: "Akdeniz turkuaz · Güneş & deniz",
    swatch: "#2DD4BF",
  },
  {
    id: "modern-craft",
    label: "Modern Hizmet",
    shortLabel: "Hizmet",
    vibe: "Antrasit · Güven & hızlı teklif",
    swatch: "#F59E0B",
  },
];

export type MessageTemplateKey = "first_touch" | "short_direct" | "follow_up";

export interface Lead {
  id: string;
  business_name: string;
  category: string;
  district: string;
  phone: string;
  google_rating: number | null;
  reviews_count: number;
  address: string;
  opening_hours: string;
  /** Venue photo URL from Google Maps / Apify OR uploaded data URL */
  image_url?: string;
  /** Real venue description / tagline from Google Maps or custom */
  description?: string;
  /** Real venue highlights / menu tags (e.g. ["Meze", "Deniz Manzarası", "Canlı Müzik"]) */
  highlights?: string[];
  /** Selected design style matched to venue ambiance */
  design_preset?: Exclude<VenueDesignPreset, "auto">;
  /** Optional custom or auto-extracted brand accent hex (e.g. "#D98A4E") */
  accent_color?: string;
  google_maps_url?: string;
  custom_message: string;
  status: LeadStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PanelSettings {
  apifyToken: string;
  outscraperKey: string;
  siteUrl: string;
  senderName: string;
  senderPhone: string;
  defaultPreset: VenueDesignPreset;
  panelPin: string;
  pinEnabled: boolean;
}
