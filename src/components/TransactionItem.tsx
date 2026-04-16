import { motion } from "framer-motion";
import { formatCurrency, CATEGORY_ICONS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
}

export function TransactionItem({ transaction, index }: TransactionItemProps) {
  const isIncome = transaction.type === "income";
  const icon = CATEGORY_ICONS[transaction.category] || "📌";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">{transaction.category}</p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-semibold ${
            isIncome ? "text-income" : "text-expense"
          }`}
        >
          {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(transaction.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </p>
      </div>
    </motion.div>
  );
}
