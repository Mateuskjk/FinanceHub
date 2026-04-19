import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Settings } from "lucide-react";

const tabs = [
  { to: "/",            icon: LayoutDashboard, label: "Início"      },
  { to: "/transactions", icon: ArrowLeftRight,  label: "Transações" },
  { to: "/savings",     icon: PiggyBank,        label: "Poupança"   },
  { to: "/reports",     icon: BarChart3,        label: "Relatórios" },
  { to: "/settings",    icon: Settings,         label: "Ajustes"    },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/80 backdrop-blur-xl safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.to);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -inset-2 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`relative h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span
                className={`text-[9px] font-medium transition-colors leading-none ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
