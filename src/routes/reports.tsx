import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useTransactions, useMonthlyData } from "@/hooks/use-transactions";
import { getTotals, formatCurrency, getCategoryTotals } from "@/lib/mock-data";
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

const periods = ["Semana", "Mês", "Trimestre", "Ano"] as const;

function ReportsPage() {
  const [period, setPeriod] = useState<string>("Mês");
  const [exporting, setExporting] = useState(false);
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: monthlyData = [] } = useMonthlyData(6);
  const { user } = useAuth();

  const totals = getTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions);

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
                      <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} name="Entradas" />
                      <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} name="Saídas" />
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
