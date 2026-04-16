import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TransactionItem } from "@/components/TransactionItem";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { useTransactions } from "@/hooks/use-transactions";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
  head: () => ({
    meta: [
      { title: "Transações — Finanças" },
      { name: "description", content: "Veja todas as suas transações financeiras." },
    ],
  }),
});

const quickFilters = ["Todas", "Hoje", "7 dias", "Este mês"] as const;

function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [showAdd, setShowAdd] = useState(false);
  const { data: transactions = [], isLoading } = useTransactions();

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const filtered = transactions.filter((t) => {
    const matchesSearch = searchQuery
      ? t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesFilter =
      activeFilter === "Todas"
        ? true
        : activeFilter === "Hoje"
        ? t.date === today
        : activeFilter === "7 dias"
        ? t.date >= sevenDaysAgo
        : t.date >= firstOfMonth;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="px-4 pt-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-xl font-bold mb-4">Transações</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar transação..."
            className="pl-10 border-0 bg-muted"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scroll-touch">
          {quickFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
              </div>
            ) : (
              filtered.map((t, i) => (
                <TransactionItem key={t.id} transaction={t} index={i} />
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        onClick={() => setShowAdd(true)}
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <AddTransactionSheet open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
