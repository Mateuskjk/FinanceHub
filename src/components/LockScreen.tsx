import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { authenticateBiometric } from "@/lib/biometric";

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-trigger Face ID as soon as the lock screen mounts
  useEffect(() => {
    tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryBiometric() {
    setLoading(true);
    setError(null);
    try {
      const ok = await authenticateBiometric();
      if (ok) {
        onUnlock();
      } else {
        setError("Autenticação falhou. Toque para tentar novamente.");
      }
    } catch {
      setError("Face ID indisponível. Toque para tentar novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6"
    >
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-12 w-12 text-primary" />
        </div>

        {/* Title */}
        <div>
          <h1 className="font-display text-2xl font-bold">App bloqueado</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Autentique-se para continuar
          </p>
        </div>

        {/* Biometric button */}
        <button
          onClick={tryBiometric}
          disabled={loading}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : (
            <Fingerprint className="h-9 w-9" />
          )}
        </button>

        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {loading ? "Aguardando Face ID…" : "Toque para usar Face ID / Touch ID"}
          </p>
        )}
      </div>
    </motion.div>
  );
}
