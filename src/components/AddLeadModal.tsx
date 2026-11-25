import { useState } from "react";
import { Plus, X } from "lucide-react";

interface AddLeadModalProps {
  isOpen: boolean;
  onAdd: (payload: {
    business_name: string;
    category: string;
    district: string;
    phone: string;
    google_rating: number | null;
    reviews_count: number;
    address: string;
    opening_hours: string;
  }) => void;
  onClose: () => void;
}

export function AddLeadModal({ isOpen, onAdd, onClose }: AddLeadModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Kafe");
  const [district, setDistrict] = useState("Antalya");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState("4.8");
  const [reviews, setReviews] = useState("150");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("Her gün 09:00 – 23:30");

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      business_name: name.trim(),
      category: category.trim(),
      district: district.trim() || "Antalya",
      phone: phone.trim(),
      google_rating: rating ? Number(rating) : null,
      reviews_count: reviews ? Number(reviews) : 0,
      address: address.trim(),
      opening_hours: hours.trim() || "Her gün 09:00 – 23:30",
    });
    setName("");
    setPhone("");
    setAddress("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="surface-card rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">
            Manuel İşletme Ekle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">İşletme Adı *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Kaleiçi Teras Kafe"
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sektör</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Kafe, Meyhane, Butik Otel"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Semt / İlçe</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Kaleiçi, Konyaaltı, Lara"
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0532..."
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Google Puan</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Yorum</label>
              <input
                type="number"
                min="0"
                value={reviews}
                onChange={(e) => setReviews(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Açık Adres</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Mahalle, sokak, Antalya"
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Çalışma Saatleri</label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm btn-gold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ekle &amp; Görsel Üret</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
