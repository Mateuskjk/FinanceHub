import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchTransactions,
  fetchMonthlyData,
  fetchCategories,
  fetchProfile,
  fetchSavings,
  createTransaction,
  deleteTransaction,
  createCategory,
  updateCategory,
  deleteCategory,
  createSavingsTransaction,
  deleteSavingsTransaction,
  type NewTransaction,
  type NewCategory,
  type NewSavingsTransaction,
} from "@/lib/api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  transactions: ["transactions"] as const,
  monthlyData: (months: number) => ["monthly-data", months] as const,
  categories: (type?: "income" | "expense") => ["categories", type] as const,
  profile: ["profile"] as const,
  savings: ["savings"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: fetchTransactions,
    staleTime: 30_000, // 30 seconds
  });
}

export function useMonthlyData(months = 6) {
  return useQuery({
    queryKey: queryKeys.monthlyData(months),
    queryFn: () => fetchMonthlyData(months),
    staleTime: 60_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
  });
}

export function useCategories(type?: "income" | "expense") {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () => fetchCategories(type),
    staleTime: 5 * 60_000, // 5 minutes — categories change rarely
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: NewTransaction) => createTransaction(tx),
    onSuccess: () => {
      // Refetch all data that depends on transactions
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: ["monthly-data"] });
      toast.success("Transação salva!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: ["monthly-data"] });
      toast.success("Transação removida.");
    },
    onError: (err: Error) => {
      toast.error("Erro ao remover: " + err.message);
    },
  });
}

// ─── Savings ─────────────────────────────────────────────────────────────────

export function useSavings() {
  return useQuery({
    queryKey: queryKeys.savings,
    queryFn: fetchSavings,
    staleTime: 30_000,
  });
}

export function useCreateSavingsTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: NewSavingsTransaction) => createSavingsTransaction(tx),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savings });
      toast.success("Movimentação registrada!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteSavingsTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavingsTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.savings });
      toast.success("Registro removido.");
    },
    onError: (err: Error) => toast.error("Erro ao remover: " + err.message),
  });
}

// ─── Category mutations ───────────────────────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cat: NewCategory) => createCategory(cat),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria criada!");
    },
    onError: (err: Error) => {
      const msg = err.message.includes("unique")
        ? "Já existe uma categoria com esse nome."
        : err.message;
      toast.error("Erro: " + msg);
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<NewCategory> }) =>
      updateCategory(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria atualizada!");
    },
    onError: (err: Error) => {
      toast.error("Erro: " + err.message);
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida.");
    },
    onError: (err: Error) => {
      toast.error("Erro ao remover: " + err.message);
    },
  });
}
