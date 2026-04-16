import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-transactions";
import type { Category } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Icon & color pickers ─────────────────────────────────────────────────────

const ICON_OPTIONS: { key: string; emoji: string; label: string }[] = [
  { key: "money-bag",    emoji: "💰", label: "Dinheiro" },
  { key: "laptop",       emoji: "💻", label: "Trabalho" },
  { key: "chart-up",     emoji: "📈", label: "Investimento" },
  { key: "piggy-bank",   emoji: "🐷", label: "Poupança" },
  { key: "burger",       emoji: "🍔", label: "Comida" },
  { key: "car",          emoji: "🚗", label: "Transporte" },
  { key: "house",        emoji: "🏠", label: "Moradia" },
  { key: "game",         emoji: "🎮", label: "Lazer" },
  { key: "pill",         emoji: "💊", label: "Saúde" },
  { key: "dumbbell",     emoji: "🏋️", label: "Academia" },
  { key: "books",        emoji: "📚", label: "Educação" },
  { key: "shopping-bag", emoji: "🛍️", label: "Compras" },
  { key: "document",     emoji: "📄", label: "Contas" },
  { key: "star",         emoji: "⭐", label: "Favorito" },
  { key: "gift",         emoji: "🎁", label: "Presente" },
  { key: "heart",        emoji: "❤️", label: "Amor" },
  { key: "plane",        emoji: "✈️", label: "Viagem" },
  { key: "pin",          emoji: "📌", label: "Outros" },
];

export const ICON_MAP: Record<string, string> = Object.fromEntries(
  ICON_OPTIONS.map(({ key, emoji }) => [key, emoji])
);

const COLOR_OPTIONS = [
  "#6640cc", "#7c58e8", "#18b470", "#26cc80",
  "#d44b23", "#e06038", "#c9a422", "#d4a830",
  "#be55e0", "#a040c8", "#2196f3", "#0ea5e9",
  "#ef4444", "#f97316", "#73778c", "#8c8fa4",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
}

type FormMode = "list" | "create" | "edit";

interface FormState {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  type: "expense",
  icon: "pin",
  color: "#6640cc",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryManager({ open, onClose }: CategoryManagerProps) {
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [mode, setMode] = useState<FormMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useCategories();
  const { mutate: createCat, isPending: creating } = useCreateCategory();
  const { mutate: updateCat, isPending: updating } = useUpdateCategory();
  const { mutate: deleteCat, isPending: deleting } = useDeleteCategory();

  const filtered = categories.filter((c) => c.type === tab);
  const defaultCats = filtered.filter((c) => c.is_default || c.user_id === null);
  const customCats  = filtered.filter((c) => !c.is_default && c.user_id !== null);

  const openCreate = () => {
    setForm({ ...DEFAULT_FORM, type: tab });
    setEditingId(null);
    setMode("create");
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, type: cat.type, icon: cat.icon ?? "pin", color: cat.color ?? "#6640cc" });
    setEditingId(cat.id);
    setMode("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (mode === "create") {
      createCat(form, { onSuccess: () => setMode("list") });
    } else if (mode === "edit" && editingId) {
      updateCat(
        { id: editingId, updates: { name: form.name, icon: form.icon, color: form.color } },
        { onSuccess: () => setMode("list") }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      deleteCat(id, { onSuccess: () => setDeleteConfirmId(null) });
    } else {
      setDeleteConfirmId(id);
      // Auto-cancel confirm after 3s
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleClose = () => {
    setMode("list");
    setDeleteConfirmId(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={mode === "list" ? handleClose : undefined}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl bg-card shadow-2xl"
            style={{ maxHeight: "90dvh" }}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-muted shrink-0" />

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-3 shrink-0">
              {mode !== "list" && (
                <button onClick={() => setMode("list")} className="rounded-full p-1 hover:bg-muted">
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              <h2 className="font-display text-lg font-bold flex-1">
                {mode === "list" ? "Categorias" : mode === "create" ? "Nova categoria" : "Editar categoria"}
              </h2>
              <button onClick={handleClose} className="rounded-full p-1 hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 scroll-touch">
              <AnimatePresence mode="wait">
                {mode === "list" ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 rounded-xl bg-muted p-1">
                      <button
                        onClick={() => setTab("expense")}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                          tab === "expense" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        Saídas
                      </button>
                      <button
                        onClick={() => setTab("income")}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                          tab === "income" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        Entradas
                      </button>
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* ── Default (global) categories ── */}
                        {defaultCats.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <Lock className="h-3 w-3" /> Padrão
                            </p>
                            <div className="rounded-xl bg-background border border-border divide-y divide-border">
                              {defaultCats.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3 px-4 py-3 opacity-80">
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                                    style={{ backgroundColor: (cat.color ?? "#6640cc") + "22" }}
                                  >
                                    {ICON_MAP[cat.icon ?? ""] ?? "📌"}
                                  </div>
                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: cat.color ?? "#6640cc" }}
                                  />
                                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── User's custom categories ── */}
                        <div className="mb-4">
                          {customCats.length > 0 && (
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Minhas categorias
                            </p>
                          )}
                          {customCats.length > 0 && (
                            <div className="rounded-xl bg-background border border-border divide-y divide-border">
                              {customCats.map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                                    style={{ backgroundColor: (cat.color ?? "#6640cc") + "22" }}
                                  >
                                    {ICON_MAP[cat.icon ?? ""] ?? "📌"}
                                  </div>
                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: cat.color ?? "#6640cc" }}
                                  />
                                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                                  <button
                                    onClick={() => openEdit(cat)}
                                    className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(cat.id)}
                                    disabled={deleting}
                                    className={`rounded-lg p-1.5 transition-colors text-sm font-medium ${
                                      deleteConfirmId === cat.id
                                        ? "bg-destructive text-white px-3"
                                        : "hover:bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {deleteConfirmId === cat.id ? (
                                      deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <Button onClick={openCreate} className="w-full gap-2 rounded-xl">
                      <Plus className="h-4 w-4" />
                      Nova categoria
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className="space-y-5"
                  >
                    {/* Type (only on create) */}
                    {mode === "create" && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <div className="mt-2 flex gap-2 rounded-xl bg-muted p-1">
                          <button
                            onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                              form.type === "expense" ? "bg-expense text-white shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Saída
                          </button>
                          <button
                            onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                              form.type === "income" ? "bg-income text-white shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Entrada
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Ex: Academia, Poupança..."
                        className="mt-1 border-0 bg-muted"
                        autoFocus
                      />
                    </div>

                    {/* Icon picker */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Ícone</Label>
                      <div className="mt-2 grid grid-cols-6 gap-2">
                        {ICON_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setForm((f) => ({ ...f, icon: opt.key }))}
                            className={`relative flex h-11 items-center justify-center rounded-xl text-xl transition-all ${
                              form.icon === opt.key
                                ? "bg-primary/15 ring-2 ring-primary"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            {opt.emoji}
                            {form.icon === opt.key && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color picker */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Cor</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setForm((f) => ({ ...f, color: c }))}
                            className={`h-8 w-8 rounded-full transition-transform active:scale-90 ${
                              form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                        style={{ backgroundColor: form.color + "22" }}
                      >
                        {ICON_MAP[form.icon] ?? "📌"}
                      </div>
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: form.color }}
                      />
                      <span className="text-sm font-medium">
                        {form.name || "Nome da categoria"}
                      </span>
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={!form.name.trim() || creating || updating}
                      className="w-full h-12 rounded-xl text-base font-semibold"
                    >
                      {creating || updating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : mode === "create" ? (
                        "Criar categoria"
                      ) : (
                        "Salvar alterações"
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
