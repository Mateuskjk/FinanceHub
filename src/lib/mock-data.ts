export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface CategoryTotal {
  name: string;
  value: number;
  color: string;
}

export const CATEGORIES = {
  income: ["Salário", "Freelance", "Investimentos", "Outros"],
  expense: [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Lazer",
    "Saúde",
    "Educação",
    "Compras",
    "Contas",
    "Outros",
  ],
} as const;

export const CATEGORY_ICONS: Record<string, string> = {
  // Nomes em português (usados nas transações)
  Alimentação: "🍔",
  Alimentacao: "🍔",
  Transporte: "🚗",
  Moradia: "🏠",
  Lazer: "🎮",
  Saúde: "💊",
  Saude: "💊",
  Educação: "📚",
  Educacao: "📚",
  Compras: "🛍️",
  Contas: "📄",
  Salário: "💰",
  Salario: "💰",
  Freelance: "💻",
  Investimentos: "📈",
  Poupança: "🐷",
  Poupanca: "🐷",
  Academia: "🏋️",
  Outros: "📌",
  // Chaves de ícone (usadas nas categorias do banco)
  "money-bag":    "💰",
  "laptop":       "💻",
  "chart-up":     "📈",
  "piggy-bank":   "🐷",
  "burger":       "🍔",
  "car":          "🚗",
  "house":        "🏠",
  "game":         "🎮",
  "pill":         "💊",
  "dumbbell":     "🏋️",
  "books":        "📚",
  "shopping-bag": "🛍️",
  "document":     "📄",
  "star":         "⭐",
  "gift":         "🎁",
  "heart":        "❤️",
  "plane":        "✈️",
  "pin":          "📌",
};

export const CHART_COLORS = [
  "oklch(0.65 0.22 275)",
  "oklch(0.72 0.18 155)",
  "oklch(0.68 0.18 25)",
  "oklch(0.78 0.14 80)",
  "oklch(0.68 0.18 310)",
  "oklch(0.6 0.15 200)",
  "oklch(0.75 0.12 50)",
  "oklch(0.58 0.2 340)",
  "oklch(0.7 0.16 120)",
];

export const mockTransactions: Transaction[] = [
  { id: "1", type: "income", amount: 8500, category: "Salário", description: "Salário mensal", date: "2026-04-15" },
  { id: "2", type: "expense", amount: 450, category: "Alimentação", description: "Supermercado", date: "2026-04-14" },
  { id: "3", type: "expense", amount: 150, category: "Transporte", description: "Combustível", date: "2026-04-13" },
  { id: "4", type: "expense", amount: 1800, category: "Moradia", description: "Aluguel", date: "2026-04-12" },
  { id: "5", type: "expense", amount: 89.9, category: "Lazer", description: "Cinema e jantar", date: "2026-04-11" },
  { id: "6", type: "income", amount: 2000, category: "Freelance", description: "Projeto web", date: "2026-04-10" },
  { id: "7", type: "expense", amount: 250, category: "Saúde", description: "Farmácia", date: "2026-04-09" },
  { id: "8", type: "expense", amount: 120, category: "Educação", description: "Curso online", date: "2026-04-08" },
  { id: "9", type: "expense", amount: 340, category: "Compras", description: "Roupas", date: "2026-04-07" },
  { id: "10", type: "expense", amount: 280, category: "Contas", description: "Internet + celular", date: "2026-04-06" },
  { id: "11", type: "income", amount: 500, category: "Investimentos", description: "Dividendos", date: "2026-04-05" },
  { id: "12", type: "expense", amount: 65, category: "Alimentação", description: "iFood", date: "2026-04-04" },
];

export const monthlyData = [
  { month: "Nov", income: 9000, expense: 5200 },
  { month: "Dez", income: 11500, expense: 7800 },
  { month: "Jan", income: 8500, expense: 4900 },
  { month: "Fev", income: 9200, expense: 5600 },
  { month: "Mar", income: 10000, expense: 6100 },
  { month: "Abr", income: 11000, expense: 3544.9 },
];

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getCategoryTotals(transactions: Transaction[]): CategoryTotal[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  const totals: Record<string, number> = {};
  expenses.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return Object.entries(totals)
    .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

export function getTotals(transactions: Transaction[]) {
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}
