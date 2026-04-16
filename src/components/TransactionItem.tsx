import { useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Trash2, Loader2, Check } from "lucide-react";
import { formatCurrency, CATEGORY_ICONS } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";
import { useDeleteTransaction } from "@/hooks/use-transactions";

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
  /** When true, renders checkbox and disables swipe */
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const SWIPE_THRESHOLD = 72; // px left to reveal delete

export function TransactionItem({
  transaction,
  index,
  selectionMode = false,
  selected = false,
  onSelect,
}: TransactionItemProps) {
  const { mutate: del, isPending } = useDeleteTransaction();
  const [revealed, setRevealed] = useState(false);
  const x = useMotionValue(0);

  const icon = CATEGORY_ICONS[transaction.category] ?? "📌";
  const isIncome = transaction.type === "income";
  const dateStr = new Date(transaction.date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  function snapOpen() {
    setRevealed(true);
    animate(x, -SWIPE_THRESHOLD, { type: "spring", stiffness: 400, damping: 35 });
  }

  function snapClose() {
    setRevealed(false);
    animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -SWIPE_THRESHOLD / 2) snapOpen();
    else snapClose();
  }

  function handleDelete() {
    del(transaction.id, { onSuccess: snapClose });
  }

  // ── Selection mode ─────────────────────────────────────────────────────────
  if (selectionMode) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        onClick={() => onSelect?.(transaction.id)}
        className="flex w-full items-center gap-3 px-3 py-3 transition-colors active:bg-muted/30 text-left"
      >
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "bg-primary border-primary" : "border-muted-foreground/40"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" />}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{transaction.description || transaction.category}</p>
          <p className="text-xs text-muted-foreground">{transaction.category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-semibold ${isIncome ? "text-income" : "text-expense"}`}>
            {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
          </p>
          <p className="text-[10px] text-muted-foreground">{dateStr}</p>
        </div>
      </motion.button>
    );
  }

  // ── Normal mode with swipe-to-delete ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="relative overflow-hidden"
    >
      {/* Delete zone behind the row */}
      <div className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-destructive">
        {isPending ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5 text-white" />
        )}
      </div>

      {/* Swipeable row */}
      <motion.div
        style={{ x }}
        drag={revealed ? false : "x"}
        dragConstraints={{ left: -SWIPE_THRESHOLD, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="relative flex items-center gap-3 px-3 py-3 bg-card"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{transaction.description || transaction.category}</p>
          <p className="text-xs text-muted-foreground">{transaction.category}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-semibold ${isIncome ? "text-income" : "text-expense"}`}>
            {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
          </p>
          <p className="text-[10px] text-muted-foreground">{dateStr}</p>
        </div>
      </motion.div>

      {/* Tap-to-confirm overlay when delete zone is revealed */}
      {revealed && (
        <>
          {/* Tap outside to close */}
          <div className="absolute inset-0 z-10" onClick={snapClose} />
          {/* Tap delete to confirm */}
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="absolute inset-y-0 right-0 z-20 flex w-[72px] items-center justify-center bg-destructive active:opacity-80"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5 text-white" />
            )}
          </button>
        </>
      )}
    </motion.div>
  );
}
