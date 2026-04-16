import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signIn, signUp, sendPasswordReset } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Entrar — Finanças" }],
  }),
});

type Mode = "login" | "signup" | "forgot";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const resetForm = (next: Mode) => {
    setError(null);
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate({ to: "/" });
      } else if (mode === "signup") {
        await signUp(email, password, fullName);
        setSignupDone(true);
      } else {
        await sendPasswordReset(email);
        setResetDone(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Algo deu errado.";
      if (msg.includes("Invalid login credentials"))
        setError("Email ou senha incorretos.");
      else if (msg.includes("User already registered"))
        setError("Este email já está cadastrado. Faça login.");
      else if (msg.includes("Password should be at least"))
        setError("A senha precisa ter ao menos 6 caracteres.");
      else if (msg.includes("For security purposes"))
        setError("Aguarde alguns segundos antes de tentar novamente.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Sign-up confirmation ───────────────────────────────────────────────────
  if (signupDone) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6 pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mb-4 text-5xl">📬</div>
          <h2 className="font-display text-xl font-bold">Verifique seu email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link e depois faça login.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => { setMode("login"); setSignupDone(false); }}
          >
            Ir para o login
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Reset confirmation ─────────────────────────────────────────────────────
  if (resetDone) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6 pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mb-4 text-5xl">🔐</div>
          <h2 className="font-display text-xl font-bold">Verifique seu email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link para redefinir a senha de <strong>{email}</strong>.
            Confira sua caixa de entrada (e spam).
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => { setMode("login"); setResetDone(false); }}
          >
            Voltar ao login
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Wallet className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Finanças</h1>
            <p className="text-sm text-muted-foreground">Controle financeiro pessoal</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Forgot password ────────────────────────────────────────────── */}
          {mode === "forgot" ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                type="button"
                onClick={() => resetForm("login")}
                className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </button>
              <h2 className="font-display text-lg font-bold mb-1">Esqueceu a senha?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Informe seu email e enviaremos um link para redefinir a senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10 border-0 bg-muted"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar link"}
                </Button>
              </form>
            </motion.div>
          ) : (
            /* ── Login / Signup ──────────────────────────────────────────── */
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Tabs */}
              <div className="mb-6 flex rounded-xl bg-muted p-1">
                <button
                  type="button"
                  onClick={() => resetForm("login")}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => resetForm("signup")}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome completo</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        className="pl-10 border-0 bg-muted"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10 border-0 bg-muted"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                      className="pl-10 pr-10 border-0 bg-muted"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link (login only) */}
                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => resetForm("forgot")}
                      className="text-xs text-primary font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
