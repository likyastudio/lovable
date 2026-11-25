# LIKYA STUDIOS — Panel v2 (`panelv2.likyastudios.live`)

Antalya'daki web sitesi olmayan işletmeleri Apify ile bulup, anında örnek mobil web sitesi ve taranabilir QR menü kartı PNG'si üreten ve tek tıkla WhatsApp'tan mesaj gönderen dahili B2B satış yönetim paneli.

## Özellikler
- **Ekip PIN Kilidi:** Yalnızca LIKYA STUDIOS ekibi erişebilir (`noindex, nofollow`).
- **Canlı Apify Entegrasyonu:** Arama kelimesi girip doğrudan tarayıcıdan Google Haritalar taraması yapar; sitesi olmayan ve telefon numarası bulunan işletmeleri otomatik filtreler.
- **Anlık PNG Tasarım & Gerçek QR Kod Üretici:** Her işletme için 2 temada (**Obsidyen Altın** ve **Atelier Kâğıt**) 720×1280 mobil web sitesi önizlemesi + `likyastudios.live/isletmeler` adresine yönlenen gerçek taranabilir QR menü kartı üretir.
- **5 Saniyelik WhatsApp Akışı:** `Mockup Kopyala` / `QR Kopyala` → `WhatsApp ile Gönder` (durumu otomatik **Mesaj Atıldı** yapar) → sohbete yapıştır.
- **Veri Yedekleme:** JSON/CSV içe aktarma ve tek tıkla JSON yedek indirme.

## Çalıştırma
```bash
npm install
npm run dev
```

## Canlıya Alma (Lovable → `panelv2.likyastudios.live`)
1. Bu repoyu (`likyastudio/lovable`) Lovable projesine bağlayın.
2. Lovable → Project Settings → Domains bölümünden `panelv2.likyastudios.live` alt alan adını bağlayın.
3. Canlı panelde sağ üstten **Ayarlar** → **Apify API Token** bilginizi bir kez kaydedin.