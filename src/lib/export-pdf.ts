import jsPDF from "jspdf";
import type { Transaction } from "./mock-data";
import { formatCurrency, getCategoryTotals, getTotals } from "./mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR = {
  primary:    [102,  64, 204] as [number, number, number],
  income:     [ 24, 180, 112] as [number, number, number],
  expense:    [212,  75,  35] as [number, number, number],
  dark:       [ 18,  20,  38] as [number, number, number],
  card:       [ 30,  32,  49] as [number, number, number],
  border:     [ 47,  49,  72] as [number, number, number],
  muted:      [140, 143, 164] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  lightGray:  [245, 245, 250] as [number, number, number],
};

const CHART_COLORS: [number, number, number][] = [
  [102,  64, 204],
  [ 24, 180, 112],
  [212,  75,  35],
  [201, 164,  34],
  [190,  85, 224],
  [ 33, 150, 243],
  [239,  68,  68],
  [249, 115,  22],
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Export function ──────────────────────────────────────────────────────────

export function exportPDF(
  transactions: Transaction[],
  userName: string,
  period = "Este mês"
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const contentW = W - margin * 2;
  const totals = getTotals(transactions);
  const categoryTotals = getCategoryTotals(transactions);
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  let y = 0;

  // ── HEADER BANNER ──────────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.primary);
  doc.rect(0, 0, W, 42, "F");

  // Logo circle
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(...COLOR.white);
  doc.setLineWidth(0.5);
  doc.circle(margin + 8, 14, 7, "D");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.white);
  doc.setFont("helvetica", "bold");
  doc.text("R$", margin + 5.2, 16.5);

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro", margin + 20, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 215, 255);
  doc.text(`${userName}  ·  ${period}  ·  Gerado em ${now}`, margin + 20, 21);

  // Balance pill
  const balanceText = formatCurrency(totals.balance);
  doc.setFillColor(255, 255, 255, 0.18);
  doc.roundedRect(margin, 27, contentW, 11, 3, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.white);
  doc.setFont("helvetica", "normal");
  doc.text("SALDO TOTAL", margin + 4, 33.5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(balanceText, W - margin - 4, 33.5, { align: "right" });

  y = 50;

  // ── SUMMARY CARDS ─────────────────────────────────────────────────────────
  const cardW = (contentW - 6) / 2;

  // Income card
  doc.setFillColor(232, 252, 243);
  doc.roundedRect(margin, y, cardW, 22, 3, 3, "F");
  doc.setFillColor(...COLOR.income);
  doc.roundedRect(margin, y, 3, 22, 1.5, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR.income);
  doc.text("ENTRADAS", margin + 7, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 80, 50);
  doc.text(formatCurrency(totals.income), margin + 7, y + 15);

  // Expense card
  doc.setFillColor(253, 235, 230);
  doc.roundedRect(margin + cardW + 6, y, cardW, 22, 3, 3, "F");
  doc.setFillColor(...COLOR.expense);
  doc.roundedRect(margin + cardW + 6, y, 3, 22, 1.5, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR.expense);
  doc.text("SAÍDAS", margin + cardW + 13, y + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 30, 10);
  doc.text(formatCurrency(totals.expense), margin + cardW + 13, y + 15);

  y += 30;

  // ── CATEGORY BREAKDOWN ─────────────────────────────────────────────────────
  if (categoryTotals.length > 0) {
    // Section title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR.dark);
    doc.text("Gastos por Categoria", margin, y + 5);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 7, W - margin, y + 7);
    y += 12;

    // Mini bar chart (horizontal)
    const barAreaH = Math.min(categoryTotals.length * 11, 80);
    doc.setFillColor(...COLOR.lightGray);
    doc.roundedRect(margin, y, contentW, barAreaH + 4, 3, 3, "F");

    let by = y + 6;
    categoryTotals.slice(0, 7).forEach((cat, i) => {
      const pct = totals.expense > 0 ? cat.value / totals.expense : 0;
      const barMaxW = contentW - 60;
      const barW = Math.max(pct * barMaxW, 2);
      const rgb = cat.color?.startsWith("#") ? hexToRgb(cat.color) : CHART_COLORS[i % CHART_COLORS.length];

      // Label
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLOR.dark);
      doc.text(cat.name, margin + 4, by + 3.5);

      // Bar background
      doc.setFillColor(220, 220, 230);
      doc.roundedRect(margin + 36, by, barMaxW, 5, 2, 2, "F");

      // Bar fill
      doc.setFillColor(...rgb);
      doc.roundedRect(margin + 36, by, barW, 5, 2, 2, "F");

      // Value + pct
      doc.setFontSize(7);
      doc.setTextColor(...COLOR.muted);
      doc.text(
        `${formatCurrency(cat.value)}  (${Math.round(pct * 100)}%)`,
        W - margin - 4, by + 4,
        { align: "right" }
      );

      by += 11;
    });

    y += barAreaH + 8;
  }

  // ── TRANSACTIONS TABLE ─────────────────────────────────────────────────────
  if (transactions.length > 0) {
    // Check if we need a new page
    if (y > 220) { doc.addPage(); y = 14; }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR.dark);
    doc.text("Transações", margin, y + 5);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 7, W - margin, y + 7);
    y += 12;

    // Table header
    doc.setFillColor(...COLOR.primary);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR.white);
    doc.text("DATA",       margin + 3,          y + 5.5);
    doc.text("DESCRIÇÃO",  margin + 24,         y + 5.5);
    doc.text("CATEGORIA",  margin + 90,         y + 5.5);
    doc.text("VALOR",      W - margin - 3,      y + 5.5, { align: "right" });
    y += 10;

    transactions.slice(0, 40).forEach((tx, i) => {
      if (y > 272) { doc.addPage(); y = 14; }

      // Alternating rows
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(margin, y - 1, contentW, 8, "F");
      }

      const isIncome = tx.type === "income";
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLOR.dark);
      doc.text(fmtDate(tx.date),     margin + 3,          y + 4.5);
      doc.text(
        tx.description.length > 30 ? tx.description.slice(0, 28) + "…" : tx.description,
        margin + 24, y + 4.5
      );
      doc.text(tx.category,          margin + 90,         y + 4.5);

      // Amount colored
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isIncome ? COLOR.income : COLOR.expense));
      doc.text(
        (isIncome ? "+" : "-") + " " + formatCurrency(tx.amount),
        W - margin - 3, y + 4.5,
        { align: "right" }
      );

      y += 8;
    });

    if (transactions.length > 40) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...COLOR.muted);
      doc.text(`… e mais ${transactions.length - 40} transações.`, margin, y + 4);
      y += 8;
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...COLOR.primary);
    doc.rect(0, 290, W, 7, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLOR.white);
    doc.text("Finanças — Controle Financeiro Pessoal", margin, 294.5);
    doc.text(`Página ${p} de ${pageCount}`, W - margin, 294.5, { align: "right" });
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const filename = `financas-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
