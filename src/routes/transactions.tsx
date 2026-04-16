import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Loader2, Trash2, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TransactionItem } from "@/components/TransactionItem";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";
import { toast } from "sonner";

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
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [showAdd, setShowAdd]           = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk]   = useState(false);

  const { data: transactions = [], isLoading } = useTransactions();
  const { mutateAsync: deleteOne } = useDeleteTransaction();

  const today         = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const firstOfMonth  = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const filtered = transactions.filter((t) => {
    const matchesSearch = searchQuery
      ? t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesFilter =
      activeFilter === "Todas"     ? true
      : activeFilter === "Hoje"    ? t.date === today
      : activeFilter === "7 dias"  ? t.date >= sevenDaysAgo
      : t.date >= firstOfMonth;
    return matchesSearch && matchesFilter;
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(filtered.map((t) => t.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const exitSelection = () => {
    setSelectionMode(false);
    clearSelection();
  };

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeletingBulk(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteOne(id)));
      toast.success(
        selectedIds.size === 1
          ? "Transação excluída."
          : `${selectedIds.size} transações excluídas.`
      );
      exitSelection();
    } catch {
      toast.error("Erro ao excluir transações.");
    } finally {
      setDeletingBulk(false);
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="px-4 pt-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        {selectionMode ? (
          <>
            <button
              onClick={exitSelection}
              className="text-sm font-medium text-muted-foreground"
            >
              Cancelar
            </button>
            <span className="text-sm font-semibold">
              {selectedIds.size > 0 ? `${selectedIds.size} selecionado${selectedIds.size > 1 ? "s" : ""}` : "Selecionar"}
            </span>
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="text-sm font-medium text-primary"
            >
              {allSelected ? "Desmarcar" : "Tudo"}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Transações</h1>
            <button
              onClick={() => setSelectionMode(true)}
              className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Selecionar
            </button>
          </>
        )}
      </div>

      {/* ── Search (hidden in selection mode) ───────────────────────────────── */}
      <AnimatePresence>
        {!selectionMode && (
          <motion.div
            initial={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar transação..."
                className="pl-10 border-0 bg-muted"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Filters ────────────────────────────────────────────────────── */}
      {!selectionMode && (
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
      )}

      {/* ── List ─────────────────────────────────────────────────────────────── */}
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
              <TransactionItem
                key={t.id}
                transaction={t}
                index={i}
                selectionMode={selectionMode}
                selected={selectedIds.has(t.id)}
                onSelect={toggleSelect}
              />
            ))
          )}
        </div>
      )}

      {/* ── Bulk delete action bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 z-40 px-4"
            style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <button
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-4 text-sm font-semibold text-white shadow-lg shadow-destructive/30 active:scale-95 transition-transform disabled:opacity-70"
            >
              {deletingBulk ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Excluir {selectedIds.size} {selectedIds.size === 1 ? "transação" : "transações"}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB (hidden in selection mode) ──────────────────────────────────── */}
      <AnimatePresence>
        {!selectionMode && (
          <motion.button
            initial={{ scale: 1 }}
            exit={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            onClick={() => setShowAdd(true)}
            className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AddTransactionSheet open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
