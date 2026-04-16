import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

interface BalanceCardProps {
  balance: number;
  income: number;
  expense: number;
}

export function BalanceCard({ balance, income, expense }: BalanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-primary p-5 text-primary-foreground"
    >
      <div className="flex items-center gap-2 opacity-80">
        <Wallet className="h-4 w-4" />
        <span className="text-sm font-medium">Saldo total</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">
        {formatCurrency(balance)}
      </p>
      <div className="mt-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/20">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] opacity-70">Entradas</p>
            <p className="text-sm font-semibold">{formatCurrency(income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/20">
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] opacity-70">Saídas</p>
            <p className="text-sm font-semibold">{formatCurrency(expense)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
