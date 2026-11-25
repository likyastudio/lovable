import { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

interface PinGateProps {
  expectedPin: string;
  onUnlock: (remember: boolean) => void;
}

export function PinGate({ expectedPin, onUnlock }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim() === expectedPin.trim()) {
      onUnlock(remember);
    } else {
      setError("Hatalı ekip PIN kodu. Tekrar deneyin.");
      setPin("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-[#090B0E]">
      <div className="surface-card rounded-2xl max-w-md w-full p-7 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl border border-[#D4A853]/35 bg-[#D4A853]/12 flex items-center justify-center text-[#D4A853]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-mono-num text-[11px] uppercase tracking-widest text-[#D4A853]">
              LIKYA STUDIOS · PANEL V2
            </p>
            <h1 className="font-display text-xl font-bold text-[#F4F0E6]">
              Dahili Satış Paneli Girişi
            </h1>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          Bu panel yalnızca LIKYA STUDIOS ekibi içindir. Devam etmek için ekip PIN kodunu girin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="panelPinInput" className="block text-xs text-zinc-400 mb-1.5">
              Ekip PIN Kodu
            </label>
            <input
              id="panelPinInput"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              placeholder="••••"
              className="input-dark w-full rounded-xl px-4 py-3 text-center text-lg font-mono-num tracking-[0.4em]"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4A853]"
            />
            <span>Bu cihazda oturumu açık tut</span>
          </label>

          <button
            type="submit"
            className="btn-gold w-full rounded-xl py-3 text-sm flex items-center justify-center gap-2"
          >
            <span>Panele Gir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-5 text-[11px] text-center text-zinc-500 font-mono-num">
          Varsayılan PIN: 2026 · Ayarlar menüsünden değiştirilebilir
        </p>
      </div>
    </div>
  );
}
