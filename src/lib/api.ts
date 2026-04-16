import { supabase } from "./supabase";
import type { Transaction, TransactionType } from "./mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  user_id: string | null; // null = global/system category
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user and guarantees a profile row exists.
 * This self-heals cases where the user signed up before the DB trigger
 * was in place (e.g. during initial setup).
 */
async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  // Upsert profile so the foreign-key on transactions is never violated.
  // ignoreDuplicates: true = no-op if the row already exists.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return user;
}

// Converts a DB row to the app's Transaction shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    category: row.category_name,
    description: row.description ?? "",
    date: row.date,
  };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function fetchTransactions(): Promise<Transaction[]> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false }); // secondary sort: newest first within same day

  if (error) throw error;
  return data.map(rowToTransaction);
}

export async function fetchTransactionsByMonth(
  year: number,
  month: number
): Promise<Transaction[]> {
  const user = await requireUser();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(year, month, 0).toISOString().slice(0, 10); // last day

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (error) throw error;
  return data.map(rowToTransaction);
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date: string;
}

export async function createTransaction(tx: NewTransaction): Promise<void> {
  const user = await requireUser();
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: tx.type,
    amount: tx.amount,
    category_name: tx.category,
    description: tx.description ?? null,
    date: tx.date,
  });
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export interface NewCategory {
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
}

export async function createCategory(cat: NewCategory): Promise<void> {
  const user = await requireUser();
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: cat.name.trim(),
    type: cat.type,
    icon: cat.icon ?? "pin",
    color: cat.color ?? "#7c58e8",
    is_default: false,
  });
  if (error) throw error;
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<NewCategory, "name" | "icon" | "color">>
): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update({ ...updates, name: updates.name?.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(
  type?: "income" | "expense"
): Promise<Category[]> {
  await requireUser(); // ensures profile exists; RLS handles row visibility
  // RLS SELECT policy returns: user's own rows + global rows (user_id IS NULL)
  let query = supabase
    .from("categories")
    .select("id, name, type, icon, color, sort_order, is_default, user_id")
    .order("is_default", { ascending: false }) // defaults first
    .order("sort_order");

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw error;
  return data as Category[];
}

// ─── Monthly chart data ───────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                      "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function fetchMonthlyData(months = 6): Promise<MonthlyData[]> {
  const user = await requireUser();

  // Date range: last N months
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const fromStr = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("user_id", user.id)
    .gte("date", fromStr);

  if (error) throw error;

  // Aggregate per month
  const map = new Map<string, { income: number; expense: number }>();
  for (const row of data) {
    const d = new Date(row.date + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
    const entry = map.get(key)!;
    if (row.type === "income") entry.income += Number(row.amount);
    else entry.expense += Number(row.amount);
  }

  // Build ordered result for the last N months
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    return { month: MONTH_LABELS[d.getMonth()], ...entry };
  });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  monthly_limit: number | null;
  initial_balance: number | null;
  theme: "light" | "dark" | "system";
}

export async function fetchProfile(): Promise<Profile | null> {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function updateProfile(updates: Partial<Profile>): Promise<void> {
  const user = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) throw error;
}
