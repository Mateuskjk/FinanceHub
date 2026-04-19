import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiggyBank, Plus, Loader2, TrendingUp, TrendingDown,
  ArrowDownCircle, ArrowUpCircle, Trash2,
} from "lucide-react";
import { useSavings, useDeleteSavingsTransaction } from "@/hooks/use-transactions";
import { AddSavingsSheet } from "@/components/AddSavingsSheet";
import type { SavingsTransaction } from "@/lib/api";
import { formatCurrency } from "@/lib/mock-data";

export const Route = createFileRoute("/savings")({
  component: SavingsPage,
  head: () => ({
    meta: [
      { title: "Poupança — Finanças" },
      { name: "description", content: "Acompanhe sua poupança." },
    ],
  }),
});

// ─── Month group ──────────────────────────────────────────────────────────────

interface MonthGroup {
  key: string;
  label: string;
  items: SavingsTransaction[];
  deposited: number;
  withdrawn: number;
}

function groupByMonth(txs: SavingsTransaction[]): MonthGroup[] {
  const map = new Map<string, SavingsTransaction[]>();
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const [y, m] = key.split("-").map(Number);
      const raw = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
        month: "long", year: "numeric",
      });
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      const deposited = items.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
      const withdrawn = items.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0);
      return { key, label, items, deposited, withdrawn };
    });
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function SavingsRow({ item, index }: { item: SavingsTransaction; index: number }) {
  const { mutate: del, isPending } = useDeleteSavingsTransaction();
  const [confirm, setConfirm] = useState(false);
  const isDeposit = item.type === "deposit";

  const handleDelete = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
    } else {
      del(item.id);
    }
  };

  const dateStr = new Date(item.date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isDeposit ? "bg-income/10" : "bg-expense/10"
        }`}
      >
        {isDeposit
          ? <ArrowDownCircle className="h-5 w-5 text-income" />
          : <ArrowUpCircle className="h-5 w-5 text-expense" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {item.description || (isDeposit ? "Depósito" : "Retirada")}
        </p>
        <p className="text-[10px] text-muted-foreground">{dateStr}</p>
      </div>

      <p className={`text-sm font-semibold shrink-0 mr-2 ${isDeposit ? "text-income" : "text-expense"}`}>
        {isDeposit ? "+" : "−"}{formatCurrency(item.amount)}
      </p>

      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors shrink-0 ${
          confirm
            ? "bg-destructive text-white"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : confirm
          ? "Confirmar"
          : <Trash2 className="h-4 w-4" />}
      </button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SavingsPage() {
  const [showAdd, setShowAdd]           = useState(false);
  const [addType, setAddType]           = useState<"deposit" | "withdrawal">("deposit");
  const { data: savings = [], isLoading } = useSavings();

  const balance   = useMemo(() =>
    savings.reduce((s, t) => t.type === "deposit" ? s + t.amount : s - t.amount, 0),
  [savings]);

  const deposited = useMemo(() =>
    savings.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0),
  [savings]);

  const withdrawn = useMemo(() =>
    savings.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0),
  [savings]);

  const groups = useMemo(() => groupByMonth(savings), [savings]);

  const openAdd = (type: "deposit" | "withdrawal") => {
    setAddType(type);
    setShowAdd(true);
  };

  return (
    <div className="px-4 pt-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-xl font-bold mb-4">Poupança</h1>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 mb-4 text-white"
          style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)" }}
        >
          <div className="flex items-center gap-2 opacity-80 mb-2">
            <PiggyBank className="h-4 w-4" />
            <span className="text-sm font-medium">Saldo em poupança</span>
          </div>
          <p className="font-display text-3xl font-bold tracking-tight">
            {formatCurrency(balance)}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] opacity-70">Depositado</p>
                <p className="text-sm font-semibold">{formatCurrency(deposited)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[10px] opacity-70">Retirado</p>
                <p className="text-sm font-semibold">{formatCurrency(withdrawn)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => openAdd("deposit")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-income/10 py-3 text-sm font-semibold text-income active:scale-95 transition-transform"
          >
            <ArrowDownCircle className="h-4 w-4" />
            Depositar
          </button>
          <button
            onClick={() => openAdd("withdrawal")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-expense/10 py-3 text-sm font-semibold text-expense active:scale-95 transition-transform"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Retirar
          </button>
        </div>

        {/* History */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl bg-card border border-border py-12 text-center">
            <PiggyBank className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma movimentação ainda</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Comece depositando na sua poupança</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key}>
                {/* Month header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-income font-medium">+{formatCurrency(group.deposited)}</span>
                    {group.withdrawn > 0 && (
                      <span className="text-expense font-medium">−{formatCurrency(group.withdrawn)}</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-card border border-border divide-y divide-border">
                  {group.items.map((item, i) => (
                    <SavingsRow key={item.id} item={item} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        onClick={() => openAdd("deposit")}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 active:scale-95 transition-transform"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <AddSavingsSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultType={addType}
      />
    </div>
  );
}
