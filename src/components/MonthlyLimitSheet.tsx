import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/hooks/use-transactions";
import { getTotals, formatCurrency } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MonthlyLimitSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MonthlyLimitSheet({ open, onClose }: MonthlyLimitSheetProps) {
  const { user } = useAuth();
  const { data: transactions = [] } = useTransactions();
  const [limitStr, setLimitStr] = useState("");
  const [currentLimit, setCurrentLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current limit from DB
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("monthly_limit")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const val = data?.monthly_limit ?? null;
        setCurrentLimit(val);
        if (val) {
          setLimitStr(
            Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
          );
        } else {
          setLimitStr("");
        }
      });
  }, [open, user]);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const num = parseInt(cleaned || "0", 10) / 100;
    setLimitStr(
      num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const parseValue = () =>
    parseFloat(limitStr.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSave = async () => {
    const val = parseValue();
    if (!val) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ monthly_limit: val })
        .eq("id", user!.id);
      if (error) throw error;
      setCurrentLimit(val);
      toast.success("Limite mensal atualizado!");
      onClose();
    } catch (err: unknown) {
      toast.error("Erro: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const totals = getTotals(transactions);
  const usedPct = currentLimit && currentLimit > 0
    ? Math.min((totals.expense / currentLimit) * 100, 100)
    : null;

  const barColor =
    usedPct === null ? "bg-primary"
    : usedPct >= 100  ? "bg-destructive"
    : usedPct >= 80   ? "bg-expense"
    : "bg-income";

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
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card p-6 shadow-2xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-bold">Limite mensal</h2>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Current usage */}
            {currentLimit && (
              <div className="mb-6 rounded-xl bg-muted p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Gasto este mês</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(totals.expense)}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      de {formatCurrency(currentLimit)}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPct ?? 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${barColor}`}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground text-right">
                  {usedPct !== null ? `${Math.round(usedPct)}% utilizado` : ""}
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Novo limite (R$)</Label>
              <Input
                value={limitStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                className="mt-1 text-2xl font-bold h-14 border-0 bg-muted"
                inputMode="numeric"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Você receberá um alerta quando os gastos se aproximarem deste valor.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={!parseValue() || loading}
              className="w-full h-12 rounded-xl text-base font-semibold mt-6"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar limite"}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
