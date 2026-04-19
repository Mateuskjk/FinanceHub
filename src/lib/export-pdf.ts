import jsPDF from "jspdf";
import type { Transaction } from "./mock-data";
import type { SavingsTransaction } from "./api";
import { formatCurrency, getCategoryTotals, getTotals } from "./mock-data";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  primary:   [102,  64, 204] as [number, number, number],
  income:    [ 24, 180, 112] as [number, number, number],
  expense:   [212,  75,  35] as [number, number, number],
  savings:   [ 14, 165, 233] as [number, number, number], // sky-500
  dark:      [ 18,  20,  38] as [number, number, number],
  border:    [ 47,  49,  72] as [number, number, number],
  muted:     [140, 143, 164] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  rowAlt:    [248, 248, 252] as [number, number, number],
  lightGray: [245, 245, 250] as [number, number, number],
};

const CHART_COLORS: [number, number, number][] = [
  [102,  64, 204], [ 24, 180, 112], [212,  75,  35],
  [201, 164,  34], [190,  85, 224], [ 33, 150, 243],
  [239,  68,  68], [249, 115,  22],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** dd/MM/yyyy — compact, never overflows a narrow column */
function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// ─── Column layout ────────────────────────────────────────────────────────────
// Page: 210 mm, margins: 14 mm each → content: 182 mm
// DATA: 28 mm | DESCRIÇÃO: 62 mm | CATEGORIA: 44 mm | VALOR: rest (right-aligned)

const M   = 14;       // margin
const W   = 210;
const CW  = W - M * 2; // 182 mm

const COL = {
  date:  M + 3,          // 17
  desc:  M + 32,         // 46
  cat:   M + 97,         // 111
  val:   W - M - 3,      // 193 (right-aligned)
};

// ─── Section title helper ─────────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.dark);
  doc.text(title, M, y + 5);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, y + 7, W - M, y + 7);
  return y + 12;
}

// ─── Table header ─────────────────────────────────────────────────────────────

function tableHeader(
  doc: jsPDF,
  y: number,
  cols: { x: number; label: string; align?: "right" }[]
) {
  doc.setFillColor(...C.primary);
  doc.roundedRect(M, y, CW, 8, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  for (const col of cols) {
    doc.text(col.label, col.x, y + 5.5, col.align ? { align: col.align } : undefined);
  }
  return y + 10;
}

// ─── Page guard ───────────────────────────────────────────────────────────────

function guardPage(doc: jsPDF, y: number, needed = 10): number {
  if (y + needed > 272) { doc.addPage(); return 14; }
  return y;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportPDF(
  transactions: Transaction[],
  savings: SavingsTransaction[],
  userName: string,
  period = "Este mês",
  initialBalance = 0
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totals = getTotals(transactions, initialBalance);
  const categoryTotals = getCategoryTotals(transactions);
  const savingsBalance = savings.reduce(
    (s, t) => t.type === "deposit" ? s + t.amount : s - t.amount, 0
  );
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  let y = 0;

  // ── HEADER BANNER ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 42, "F");

  doc.setDrawColor(...C.white);
  doc.setLineWidth(0.5);
  doc.circle(M + 8, 14, 7, "D");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("R$", M + 5.2, 16.5);

  doc.setFontSize(18);
  doc.text("Relatório Financeiro", M + 20, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 215, 255);
  doc.text(`${userName}  ·  ${period}  ·  Gerado em ${now}`, M + 20, 21);

  // Balance pill
  doc.setFillColor(0, 0, 0);  // workaround: jsPDF ignores alpha in setFillColor
  doc.setGState(doc.GState({ opacity: 0.25 }));
  doc.roundedRect(M, 27, CW, 11, 3, 3, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.white);
  doc.text("SALDO TOTAL", M + 4, 33.5);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totals.balance), W - M - 4, 33.5, { align: "right" });

  y = 50;

  // ── SUMMARY CARDS ────────────────────────────────────────────────────────────
  const cardW3 = (CW - 8) / 3;

  // Entradas
  doc.setFillColor(232, 252, 243);
  doc.roundedRect(M, y, cardW3, 22, 3, 3, "F");
  doc.setFillColor(...C.income);
  doc.roundedRect(M, y, 3, 22, 1.5, 1.5, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.income);
  doc.text("ENTRADAS", M + 7, y + 7);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 80, 50);
  doc.text(formatCurrency(totals.income), M + 7, y + 15);

  // Saídas
  const cx2 = M + cardW3 + 4;
  doc.setFillColor(253, 235, 230);
  doc.roundedRect(cx2, y, cardW3, 22, 3, 3, "F");
  doc.setFillColor(...C.expense);
  doc.roundedRect(cx2, y, 3, 22, 1.5, 1.5, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.expense);
  doc.text("SAÍDAS", cx2 + 7, y + 7);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 30, 10);
  doc.text(formatCurrency(totals.expense), cx2 + 7, y + 15);

  // Poupança
  const cx3 = M + (cardW3 + 4) * 2;
  doc.setFillColor(224, 242, 254);
  doc.roundedRect(cx3, y, cardW3, 22, 3, 3, "F");
  doc.setFillColor(...C.savings);
  doc.roundedRect(cx3, y, 3, 22, 1.5, 1.5, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.savings);
  doc.text("POUPANÇA", cx3 + 7, y + 7);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(7, 89, 133);
  doc.text(formatCurrency(savingsBalance), cx3 + 7, y + 15);

  y += 30;

  // ── CATEGORY BREAKDOWN ───────────────────────────────────────────────────────
  if (categoryTotals.length > 0) {
    y = sectionTitle(doc, "Gastos por Categoria", y);

    const barAreaH = Math.min(categoryTotals.length * 11, 80);
    doc.setFillColor(...C.lightGray);
    doc.roundedRect(M, y, CW, barAreaH + 4, 3, 3, "F");

    let by = y + 6;
    categoryTotals.slice(0, 7).forEach((cat, i) => {
      const pct = totals.expense > 0 ? cat.value / totals.expense : 0;
      const barMaxW = CW - 70;
      const barW = Math.max(pct * barMaxW, 2);
      const rgb = cat.color?.startsWith("#") ? hexToRgb(cat.color) : CHART_COLORS[i % CHART_COLORS.length];

      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      doc.text(truncate(cat.name, 14), M + 4, by + 3.5);

      doc.setFillColor(220, 220, 230);
      doc.roundedRect(M + 42, by, barMaxW, 5, 2, 2, "F");
      doc.setFillColor(...rgb);
      doc.roundedRect(M + 42, by, barW, 5, 2, 2, "F");

      doc.setFontSize(7); doc.setTextColor(...C.muted);
      doc.text(
        `${formatCurrency(cat.value)}  (${Math.round(pct * 100)}%)`,
        W - M - 4, by + 4, { align: "right" }
      );
      by += 11;
    });

    y += barAreaH + 8;
  }

  // ── TRANSACTIONS TABLE ───────────────────────────────────────────────────────
  if (transactions.length > 0) {
    y = guardPage(doc, y, 30);
    y = sectionTitle(doc, "Transações", y);

    y = tableHeader(doc, y, [
      { x: COL.date,  label: "DATA"      },
      { x: COL.desc,  label: "DESCRIÇÃO" },
      { x: COL.cat,   label: "CATEGORIA" },
      { x: COL.val,   label: "VALOR", align: "right" },
    ]);

    transactions.slice(0, 50).forEach((tx, i) => {
      y = guardPage(doc, y, 9);

      if (i % 2 === 0) {
        doc.setFillColor(...C.rowAlt);
        doc.rect(M, y - 1, CW, 8, "F");
      }

      const isIncome = tx.type === "income";
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      doc.text(fmtDate(tx.date),                  COL.date, y + 4.5);
      doc.text(truncate(tx.description || tx.category, 34), COL.desc, y + 4.5);
      doc.text(truncate(tx.category, 22),          COL.cat,  y + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isIncome ? C.income : C.expense));
      doc.text(
        (isIncome ? "+ " : "- ") + formatCurrency(tx.amount),
        COL.val, y + 4.5, { align: "right" }
      );
      y += 8;
    });

    if (transactions.length > 50) {
      doc.setFontSize(7); doc.setFont("helvetica", "italic");
      doc.setTextColor(...C.muted);
      doc.text(`… e mais ${transactions.length - 50} transações.`, M, y + 4);
      y += 8;
    }

    y += 4;
  }

  // ── SAVINGS TABLE ────────────────────────────────────────────────────────────
  if (savings.length > 0) {
    y = guardPage(doc, y, 30);
    y = sectionTitle(doc, "Poupança", y);

    // Savings summary line
    const savDep = savings.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
    const savWit = savings.filter((t) => t.type === "withdrawal").reduce((s, t) => s + t.amount, 0);
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(M, y, CW, 8, 2, 2, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.savings);
    doc.text(`Depositado: ${formatCurrency(savDep)}`, M + 4, y + 5.5);
    doc.setTextColor(...C.expense);
    doc.text(`Retirado: ${formatCurrency(savWit)}`, M + 70, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(7, 89, 133);
    doc.text(`Saldo: ${formatCurrency(savingsBalance)}`, W - M - 4, y + 5.5, { align: "right" });
    y += 12;

    y = tableHeader(doc, y, [
      { x: COL.date, label: "DATA"      },
      { x: COL.desc, label: "DESCRIÇÃO" },
      { x: COL.cat,  label: "TIPO"      },
      { x: COL.val,  label: "VALOR", align: "right" },
    ]);

    savings.slice(0, 50).forEach((tx, i) => {
      y = guardPage(doc, y, 9);

      if (i % 2 === 0) {
        doc.setFillColor(...C.rowAlt);
        doc.rect(M, y - 1, CW, 8, "F");
      }

      const isDeposit = tx.type === "deposit";
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      doc.text(fmtDate(tx.date),                             COL.date, y + 4.5);
      doc.text(truncate(tx.description || (isDeposit ? "Depósito" : "Retirada"), 34), COL.desc, y + 4.5);
      doc.text(isDeposit ? "Depósito" : "Retirada",          COL.cat,  y + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isDeposit ? C.savings : C.expense));
      doc.text(
        (isDeposit ? "+ " : "- ") + formatCurrency(tx.amount),
        COL.val, y + 4.5, { align: "right" }
      );
      y += 8;
    });

    y += 4;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.primary);
    doc.rect(0, 290, W, 7, "F");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.white);
    doc.text("Finanças — Controle Financeiro Pessoal", M, 294.5);
    doc.text(`Página ${p} de ${pages}`, W - M, 294.5, { align: "right" });
  }

  const filename = `financas-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
