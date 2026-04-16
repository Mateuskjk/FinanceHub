import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, User, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileSheet({ open, onClose }: EditProfileSheetProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [initialBalanceStr, setInitialBalanceStr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.user_metadata?.full_name ?? "");
    // Load current initial_balance from DB
    fetchProfile().then((p) => {
      const val = p?.initial_balance ?? 0;
      setInitialBalanceStr(
        val > 0
          ? val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ""
      );
    });
  }, [open, user]);

  const handleBalanceChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const num = parseInt(cleaned || "0", 10) / 100;
    setInitialBalanceStr(
      num > 0
        ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ""
    );
  };

  const parseBalance = () =>
    parseFloat(initialBalanceStr.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (authError) throw authError;

      // Update profiles table
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), initial_balance: parseBalance() })
        .eq("id", user!.id);
      if (dbError) throw dbError;

      // Invalidate profile + transactions so dashboard recalculates balance
      qc.invalidateQueries({ queryKey: queryKeys.profile });

      toast.success("Perfil atualizado!");
      onClose();
    } catch (err: unknown) {
      toast.error("Erro: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const initials = (fullName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto scroll-touch rounded-t-3xl bg-card p-6 shadow-2xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-bold">Editar perfil</h2>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold text-3xl">
                {initials}
              </div>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <Label className="text-xs text-muted-foreground">Nome completo</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-10 border-0 bg-muted"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="mt-1 border-0 bg-muted opacity-60 cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  O email não pode ser alterado.
                </p>
              </div>

              {/* Initial balance */}
              <div>
                <Label className="text-xs text-muted-foreground">Saldo inicial (R$)</Label>
                <div className="relative mt-1">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={initialBalanceStr}
                    onChange={(e) => handleBalanceChange(e.target.value)}
                    placeholder="0,00"
                    inputMode="numeric"
                    className="pl-10 border-0 bg-muted text-base font-semibold"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Informe o saldo atual da sua conta. O app somará entradas e subtrairá saídas a partir desse valor.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={!fullName.trim() || loading}
              className="w-full h-12 rounded-xl text-base font-semibold mt-6"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar"}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
