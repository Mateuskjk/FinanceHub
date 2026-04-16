import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Plus, Bell, ChevronRight, Loader2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { useTransactions, useMonthlyData, useProfile } from "@/hooks/use-transactions";
import { getTotals, getCategoryTotals, formatCurrency } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Finanças" },
      { name: "description", content: "Visão geral das suas finanças pessoais." },
    ],
  }),
});

function Dashboard() {
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: monthlyData = [] } = useMonthlyData(6);
  const { data: profile } = useProfile();

  const initialBalance = profile?.initial_balance ?? 0;
  const totals = getTotals(transactions, initialBalance);
  const categoryTotals = getCategoryTotals(transactions);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-muted-foreground">Olá 👋</p>
          <h1 className="font-display text-xl font-bold">Minhas finanças</h1>
        </div>
        <button className="relative rounded-full bg-muted p-2.5">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Balance Card */}
      <BalanceCard balance={totals.balance} income={totals.income} expense={totals.expense} />

      {/* Loading state */}
      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Insights */}
          {categoryTotals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 rounded-xl bg-card border border-border p-4"
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">💡 Insight</p>
              <p className="text-sm text-foreground">
                Seus gastos com <strong>{categoryTotals[0].name}</strong> representam{" "}
                <strong className="text-expense">
                  {totals.expense > 0
                    ? Math.round((categoryTotals[0].value / totals.expense) * 100)
                    : 0}
                  %
                </strong>{" "}
                do total de saídas este mês.
              </p>
            </motion.div>
          )}

          {/* Category Chart */}
          {categoryTotals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <h2 className="font-display text-base font-semibold mb-3">Para onde vai seu dinheiro</h2>
              <div className="flex items-center gap-4 rounded-xl bg-card border border-border p-4">
                <div className="h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryTotals}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categoryTotals.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {categoryTotals.slice(0, 4).map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-muted-foreground truncate">{cat.name}</span>
                      </div>
                      <span className="font-medium ml-2 shrink-0">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Line chart */}
          {monthlyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <h2 className="font-display text-base font-semibold mb-3">Evolução financeira</h2>
              <div className="h-44 rounded-xl bg-card border border-border p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
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
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="var(--income)"
                      strokeWidth={2.5}
                      dot={false}
                      name="Entradas"
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="var(--expense)"
                      strokeWidth={2.5}
                      dot={false}
                      name="Saídas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 mb-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-base font-semibold">Últimas transações</h2>
              <button
                onClick={() => navigate({ to: "/transactions" })}
                className="flex items-center gap-1 text-xs text-primary font-medium"
              >
                Ver todas <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="rounded-xl bg-card border border-border py-10 text-center">
                <p className="text-3xl mb-2">💸</p>
                <p className="text-sm text-muted-foreground">Nenhuma transação ainda</p>
              </div>
            ) : (
              <div className="rounded-xl bg-card border border-border divide-y divide-border">
                {recentTransactions.map((t, i) => (
                  <TransactionItem key={t.id} transaction={t} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
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
