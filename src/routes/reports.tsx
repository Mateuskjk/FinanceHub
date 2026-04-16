import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, Loader2, ChevronDown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useTransactions, useMonthlyData, useProfile } from "@/hooks/use-transactions";
import { getTotals, formatCurrency, getCategoryTotals } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";
import { exportPDF } from "@/lib/export-pdf";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Relatórios — Finanças" },
      { name: "description", content: "Relatórios detalhados das suas finanças." },
    ],
  }),
});

// ─── Monthly statement types ──────────────────────────────────────────────────

interface MonthStatement {
  key: string;          // "2026-04"
  label: string;        // "Abril 2026"
  opening: number;      // saldo inicial do mês
  income: number;       // entradas do mês
  expense: number;      // saídas do mês
  closing: number;      // saldo final = opening + income - expense
  transactions: Transaction[];
}

function buildStatements(
  transactions: Transaction[],
  initialBalance: number
): MonthStatement[] {
  // Group by YYYY-MM
  const byMonth = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(t);
  }

  const sortedKeys = [...byMonth.keys()].sort(); // oldest → newest
  let running = initialBalance;

  const statements: MonthStatement[] = sortedKeys.map((key) => {
    const txs = byMonth.get(key)!;
    const income  = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const opening = running;
    const closing = opening + income - expense;
    running = closing;

    const [y, m] = key.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long", year: "numeric",
    });

    // Sort transactions: newest date first, then newest created
    const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
    return { key, label: label.charAt(0).toUpperCase() + label.slice(1), opening, income, expense, closing, transactions: sorted };
  });

  return statements.reverse(); // newest first for display
}

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({ stmt, index }: { stmt: MonthStatement; index: number }) {
  const [open, setOpen] = useState(false);
  const balanceColor = stmt.closing >= 0 ? "text-income" : "text-expense";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl bg-card border border-border overflow-hidden"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-bold">{stmt.label}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[11px] text-income font-medium">
              +{formatCurrency(stmt.income)}
            </span>
            <span className="text-[11px] text-expense font-medium">
              −{formatCurrency(stmt.expense)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">Saldo final</p>
          <p className={`text-sm font-bold ${balanceColor}`}>
            {formatCurrency(stmt.closing)}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Summary rows */}
            <div className="mx-4 mb-3 rounded-xl bg-muted divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Saldo inicial</span>
                </div>
                <span className={`text-xs font-semibold ${stmt.opening >= 0 ? "" : "text-expense"}`}>
                  {formatCurrency(stmt.opening)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-income" />
                  <span className="text-xs text-muted-foreground">Entradas</span>
                </div>
                <span className="text-xs font-semibold text-income">
                  +{formatCurrency(stmt.income)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5 text-expense" />
                  <span className="text-xs text-muted-foreground">Saídas</span>
                </div>
                <span className="text-xs font-semibold text-expense">
                  −{formatCurrency(stmt.expense)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">Saldo final</span>
                </div>
                <span className={`text-xs font-bold ${balanceColor}`}>
                  {formatCurrency(stmt.closing)}
                </span>
              </div>
            </div>

            {/* Transaction list */}
            {stmt.transactions.length > 0 && (
              <div className="mx-4 mb-4 rounded-xl bg-background border border-border divide-y divide-border">
                {stmt.transactions.map((t) => {
                  const isIncome = t.type === "income";
                  const dateStr = new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short",
                  });
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.category} · {dateStr}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${isIncome ? "text-income" : "text-expense"}`}>
                        {isIncome ? "+" : "−"}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const periods = ["Semana", "Mês", "Trimestre", "Ano"] as const;

function ReportsPage() {
  const [period, setPeriod]     = useState<string>("Mês");
  const [exporting, setExporting] = useState(false);

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: monthlyData = [] }             = useMonthlyData(6);
  const { data: profile }                      = useProfile();
  const { user }                               = useAuth();

  const initialBalance = profile?.initial_balance ?? 0;
  const totals         = getTotals(transactions, initialBalance);
  const categoryTotals = getCategoryTotals(transactions);

  const statements = useMemo(
    () => buildStatements(transactions, initialBalance),
    [transactions, initialBalance]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
      exportPDF(transactions, name, period);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 pt-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-bold">Relatórios</h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
          >
            {exporting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileDown className="h-3.5 w-3.5" />}
            Exportar PDF
          </Button>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 mb-5">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-income-muted p-4">
                <p className="text-xs text-income font-medium">Total entradas</p>
                <p className="mt-1 font-display text-lg font-bold text-income">
                  {formatCurrency(totals.income)}
                </p>
              </div>
              <div className="rounded-xl bg-expense-muted p-4">
                <p className="text-xs text-expense font-medium">Total saídas</p>
                <p className="mt-1 font-display text-lg font-bold text-expense">
                  {formatCurrency(totals.expense)}
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            {monthlyData.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-base font-semibold mb-3">Entradas vs Saídas</h2>
                <div className="h-52 rounded-xl bg-card border border-border p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Bar dataKey="income"  fill="var(--income)"  radius={[4,4,0,0]} name="Entradas" />
                      <Bar dataKey="expense" fill="var(--expense)" radius={[4,4,0,0]} name="Saídas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryTotals.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-base font-semibold mb-3">Gastos por categoria</h2>
                <div className="rounded-xl bg-card border border-border divide-y divide-border">
                  {categoryTotals.map((cat) => {
                    const pct = totals.expense > 0
                      ? Math.round((cat.value / totals.expense) * 100)
                      : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{cat.name}</span>
                            <span className="text-sm font-semibold ml-2 shrink-0">
                              {formatCurrency(cat.value)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Statement */}
            {statements.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-base font-semibold mb-3">Extrato mensal</h2>
                <div className="space-y-3">
                  {statements.map((stmt, i) => (
                    <MonthCard key={stmt.key} stmt={stmt} index={i} />
                  ))}
                </div>
              </div>
            )}

            {transactions.length === 0 && (
              <div className="rounded-xl bg-card border border-border py-12 text-center">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm text-muted-foreground">Nenhum dado disponível ainda</p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
