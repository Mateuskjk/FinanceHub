import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateSavingsTransaction } from "@/hooks/use-transactions";

interface AddSavingsSheetProps {
  open: boolean;
  onClose: () => void;
  defaultType?: "deposit" | "withdrawal";
}

export function AddSavingsSheet({ open, onClose, defaultType = "deposit" }: AddSavingsSheetProps) {
  const [type, setType]             = useState<"deposit" | "withdrawal">(defaultType);
  const [amountStr, setAmountStr]   = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));

  const { mutate, isPending } = useCreateSavingsTransaction();

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setAmountStr("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultType]);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const num = parseInt(cleaned || "0", 10) / 100;
    setAmountStr(
      num > 0
        ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ""
    );
  };

  const parseAmount = () =>
    parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;

  const handleSave = () => {
    const amount = parseAmount();
    if (!amount) return;
    mutate(
      { type, amount, description: description.trim() || undefined, date },
      { onSuccess: onClose }
    );
  };

  const isDeposit = type === "deposit";

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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto scroll-touch rounded-t-3xl bg-card shadow-2xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="p-6">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg font-bold">Movimentar poupança</h2>
                <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Type selector */}
              <div className="flex gap-2 rounded-xl bg-muted p-1 mb-6">
                <button
                  onClick={() => setType("deposit")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    isDeposit ? "bg-income text-white shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Depositar
                </button>
                <button
                  onClick={() => setType("withdrawal")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    !isDeposit ? "bg-expense text-white shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Retirar
                </button>
              </div>

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                  <Input
                    value={amountStr}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    inputMode="numeric"
                    className={`mt-1 text-2xl font-bold h-14 border-0 bg-muted text-center ${
                      isDeposit ? "text-income" : "text-expense"
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Reserva de emergência..."
                    className="mt-1 border-0 bg-muted"
                  />
                </div>

                {/* Date */}
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 border-0 bg-muted"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!parseAmount() || isPending}
                className={`w-full h-12 rounded-xl text-base font-semibold mt-6 ${
                  isDeposit
                    ? "bg-income hover:bg-income/90"
                    : "bg-expense hover:bg-expense/90"
                }`}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isDeposit ? (
                  "Depositar"
                ) : (
                  "Retirar"
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
