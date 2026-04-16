import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDownLeft, ArrowUpRight, CalendarIcon, Loader2 } from "lucide-react";
import type { TransactionType } from "@/lib/mock-data";
import { useCreateTransaction, useCategories } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddTransactionSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddTransactionSheet({ open, onClose }: AddTransactionSheetProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { mutate: createTransaction, isPending } = useCreateTransaction();
  const { data: allCategories = [] } = useCategories(type);

  const categories = allCategories.map((c) => c.name);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const num = parseInt(cleaned || "0", 10) / 100;
    setAmount(
      num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const parseAmount = () => {
    return parseFloat(amount.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSave = () => {
    const numericAmount = parseAmount();
    if (!numericAmount || !category) return;

    createTransaction(
      { type, amount: numericAmount, category, description, date },
      {
        onSuccess: () => {
          onClose();
          setAmount("");
          setCategory("");
          setDescription("");
          setDate(new Date().toISOString().slice(0, 10));
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto scroll-touch rounded-t-3xl bg-card p-6 shadow-2xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-bold">Nova transação</h2>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="mb-5 flex gap-2 rounded-xl bg-muted p-1">
              <button
                onClick={() => { setType("expense"); setCategory(""); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  type === "expense" ? "bg-expense text-white shadow-sm" : "text-muted-foreground"
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Saída
              </button>
              <button
                onClick={() => { setType("income"); setCategory(""); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  type === "income" ? "bg-income text-white shadow-sm" : "text-muted-foreground"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Entrada
              </button>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <Input
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                className="mt-1 text-2xl font-bold h-14 border-0 bg-muted"
                inputMode="numeric"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      category === cat
                        ? type === "income"
                          ? "bg-income text-white"
                          : "bg-expense text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado"
                className="mt-1 border-0 bg-muted"
              />
            </div>

            {/* Date */}
            <div className="mb-6">
              <Label className="text-xs text-muted-foreground">Data</Label>
              <div className="relative mt-1">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 border-0 bg-muted"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={!amount || !category || isPending}
              className={`w-full h-12 rounded-xl text-base font-semibold ${
                type === "income"
                  ? "bg-income hover:bg-income/90 text-white"
                  : "bg-expense hover:bg-expense/90 text-white"
              }`}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Salvar transação"
              )}
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
