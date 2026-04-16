import { useEffect, useState } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { LockScreen } from "@/components/LockScreen";
import { useAuth } from "@/hooks/use-auth";
import {
  isBiometricEnabled,
  recordHideTimestamp,
  shouldLockOnResume,
  clearHideTimestamp,
} from "@/lib/biometric";

import appCss from "../styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Finanças — Controle Financeiro Pessoal" },
      { name: "description", content: "Gerencie suas finanças pessoais com simplicidade e inteligência." },
      { property: "og:title", content: "Finanças — Controle Financeiro Pessoal" },
      { property: "og:description", content: "Gerencie suas finanças pessoais com simplicidade e inteligência." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [locked, setLocked] = useState(false);

  // ── Biometric app-lock logic (client-only) ─────────────────────────────────
  useEffect(() => {
    if (!isBiometricEnabled()) return;

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordHideTimestamp();
      } else if (document.visibilityState === "visible") {
        if (shouldLockOnResume()) {
          clearHideTimestamp();
          setLocked(true);
        }
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/login" });
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg min-h-[100dvh] pt-safe pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
      <Outlet />
      <BottomNav />
    </div>
  );
}

function RootComponent() {
  const { pathname } = useLocation();
  const isPublicPage = pathname === "/login" || pathname === "/reset-password";

  return (
    <QueryClientProvider client={queryClient}>
      {isPublicPage ? <Outlet /> : <AppLayout />}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
