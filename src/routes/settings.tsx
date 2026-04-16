import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Moon, Sun, User, Wallet, Tag, ChevronRight, LogOut, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/api";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  registerBiometric,
  disableBiometric,
} from "@/lib/biometric";
import { CategoryManager } from "@/components/CategoryManager";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { MonthlyLimitSheet } from "@/components/MonthlyLimitSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Configurações — Finanças" },
      { name: "description", content: "Configure seu aplicativo financeiro." },
    ],
  }),
});

function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMonthlyLimit, setShowMonthlyLimit] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    isBiometricAvailable().then((ok) => {
      setBiometricAvailable(ok);
      if (ok) setBiometricOn(isBiometricEnabled());
    });
  }, []);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const handleBiometricToggle = async () => {
    if (biometricOn) {
      disableBiometric();
      setBiometricOn(false);
      toast.success("Face ID desativado.");
      return;
    }
    setBiometricLoading(true);
    try {
      const displayName = user?.user_metadata?.full_name ?? user?.email ?? "Usuário";
      const ok = await registerBiometric(user!.id, user!.email!, displayName);
      if (ok) {
        setBiometricOn(true);
        toast.success("Face ID ativado! O app será bloqueado após 30 s em segundo plano.");
      } else {
        toast.error("Não foi possível ativar o Face ID.");
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = user?.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  const menuItems = [
    { icon: User,   label: "Editar perfil",  sub: "Nome, email",              onClick: () => setShowEditProfile(true) },
    { icon: Wallet, label: "Limite mensal",  sub: "Definir limite de gastos", onClick: () => setShowMonthlyLimit(true) },
    { icon: Tag,    label: "Categorias",     sub: "Criar, editar ou excluir", onClick: () => setShowCategories(true) },
  ];

  return (
    <div className="px-4 pt-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-xl font-bold mb-6">Configurações</h1>

        {/* Profile card */}
        <div
          className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 mb-6 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowEditProfile(true)}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold text-lg">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* Theme Toggle */}
        <div className="rounded-xl bg-card border border-border p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className="text-sm font-medium">Modo escuro</p>
              <p className="text-xs text-muted-foreground">
                {darkMode ? "Ativado" : "Desativado"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              darkMode ? "bg-primary" : "bg-muted"
            }`}
          >
            <motion.div
              animate={{ x: darkMode ? 22 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
            />
          </button>
        </div>

        {/* Face ID toggle — only shown when device supports it */}
        {biometricAvailable && (
          <div className="rounded-xl bg-card border border-border p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Fingerprint className={`h-5 w-5 ${biometricOn ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">Face ID / Touch ID</p>
                <p className="text-xs text-muted-foreground">
                  {biometricOn ? "Bloqueia ao sair do app" : "Desativado"}
                </p>
              </div>
            </div>
            <button
              onClick={handleBiometricToggle}
              disabled={biometricLoading}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                biometricOn ? "bg-primary" : "bg-muted"
              } disabled:opacity-60`}
            >
              <motion.div
                animate={{ x: biometricOn ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
              />
            </button>
          </div>
        )}

        {/* Menu Items */}
        <div className="rounded-xl bg-card border border-border divide-y divide-border mb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-95 transition-transform"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </motion.div>

      <EditProfileSheet  open={showEditProfile}   onClose={() => setShowEditProfile(false)} />
      <MonthlyLimitSheet open={showMonthlyLimit}  onClose={() => setShowMonthlyLimit(false)} />
      <CategoryManager   open={showCategories}    onClose={() => setShowCategories(false)} />
    </div>
  );
}
