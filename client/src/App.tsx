import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminGuard } from "@/components/admin-guard";
import { AdminAuthProvider } from "@/components/admin-auth-context";
import { StockAlert } from "@/components/stock-alert";
import { DebtAlert } from "@/components/debt-alert";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import { POSControlsProvider, usePOSControls } from "@/contexts/pos-controls-context";
import { SubscriptionModal } from "@/components/subscription-modal";
import { LANGUAGES } from "@/lib/i18n";
import { useSettings } from "@/hooks/use-settings";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Moon, Sun, History, ShoppingCart, CreditCard } from "lucide-react";

import POS from "@/pages/pos";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import ExpensesPage from "@/pages/expenses";
import FinancialPage from "@/pages/financial";
import InventoryPage from "@/pages/inventory";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={POS} />
      <Route path="/products">
        <AdminGuard><Products /></AdminGuard>
      </Route>
      <Route path="/inventory">
        <AdminGuard><InventoryPage /></AdminGuard>
      </Route>
      <Route path="/expenses">
        <AdminGuard><ExpensesPage /></AdminGuard>
      </Route>
      <Route path="/financial">
        <AdminGuard><FinancialPage /></AdminGuard>
      </Route>
      <Route path="/reports">
        <AdminGuard><Reports /></AdminGuard>
      </Route>
      <Route path="/settings">
        <AdminGuard><SettingsPage /></AdminGuard>
      </Route>
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find(l => l.code === language)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          data-testid="button-language-switcher"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{current.flag} {current.label}</span>
          <span className="sm:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`gap-2 cursor-pointer ${lang.code === language ? "font-bold text-primary" : ""}`}
            data-testid={`option-language-${lang.code}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            {lang.code === language && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderStoreName() {
  const { data: settings } = useSettings();
  return (
    <div className="flex items-center gap-2">
      {settings?.storeImage ? (
        <img
          src={settings.storeImage}
          alt="logo"
          className="w-7 h-7 rounded-lg object-cover border border-border/50 shadow-sm flex-shrink-0"
          data-testid="img-store-header"
        />
      ) : null}
      <span className="hidden md:block font-display font-bold text-sm text-primary truncate max-w-[180px]">
        {settings?.storeName || "KioscoPOS"}
      </span>
    </div>
  );
}

function POSHeaderButtons() {
  const [location] = useLocation();
  const { isDarkMode, toggleDarkMode, setHistoryOpen, setClosureOpen, showSidebar, toggleSidebar } = usePOSControls();
  const { t } = useLanguage();

  if (location !== "/") return null;

  return (
    <>
      <div className="w-px h-5 bg-border/60 mx-1" />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={toggleSidebar}
        data-testid="button-pos-sidebar-toggle"
        title={showSidebar ? t.pos.ticket : t.pos.search}
      >
        <ShoppingCart className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={toggleDarkMode}
        data-testid="button-pos-darkmode"
        title={isDarkMode ? "Modo claro" : "Modo oscuro"}
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={() => setHistoryOpen(true)}
        data-testid="button-pos-history"
        title={t.pos.recentSales}
      >
        <History className="w-4 h-4" />
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="rounded-full px-2 sm:px-4 font-bold h-8 text-xs"
        onClick={() => setClosureOpen(true)}
        data-testid="button-pos-closure"
      >
        <span className="hidden sm:inline">{t.pos.dailyClosure}</span>
        <span className="sm:hidden">✕</span>
      </Button>
    </>
  );
}

function isSubscriptionExpired(paidUntil: string | undefined, paymentLink: string | undefined, plan: string | undefined): boolean {
  if (plan === "total") return false;
  if (plan === "demo") {
    if (!paidUntil) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const until = new Date(paidUntil + "T00:00:00");
    return today > until;
  }
  if (!paymentLink) return false;
  if (!paidUntil) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(paidUntil + "T00:00:00");
  return today > until;
}

function AppContent() {
  const { data: settings, isLoading } = useSettings();
  const [subOpen, setSubOpen] = useState(false);

  const isPlanTotal = settings?.subscriptionPlan === "total";
  const isPlanDemo = settings?.subscriptionPlan === "demo";
  const expired = !isLoading && isSubscriptionExpired(
    settings?.subscriptionPaidUntil,
    settings?.subscriptionPaymentLink,
    settings?.subscriptionPlan
  );

  useEffect(() => {
    if (!isLoading && isPlanDemo && !settings?.subscriptionPaidUntil) {
      const demoExpiry = new Date();
      demoExpiry.setDate(demoExpiry.getDate() + 30);
      const paidUntil = demoExpiry.toISOString().split("T")[0];
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPaidUntil: paidUntil }),
      });
    }
  }, [isLoading, isPlanDemo, settings?.subscriptionPaidUntil]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <POSControlsProvider>
      <TooltipProvider>
        <SidebarProvider style={style}>
          <div className="flex h-screen w-full bg-background overflow-hidden print:bg-white print:h-auto print:overflow-visible">
            <div className="print:hidden h-full">
              <AppSidebar />
            </div>
            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
              <header className="flex items-center justify-between p-3 border-b border-border/50 bg-card print:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg" />
                  <HeaderStoreName />
                  <LanguageSwitcher />
                  <POSHeaderButtons />
                </div>
                <div className="flex items-center gap-2 pr-1">
                  <DebtAlert />
                  <StockAlert />
                  {!isPlanTotal && (
                    <Button
                      variant={isPlanDemo && !expired ? "secondary" : "outline"}
                      size="sm"
                      className={`h-8 gap-1.5 text-xs font-semibold rounded-full ${isPlanDemo && !expired ? "border-amber-400 text-amber-600 dark:text-amber-400" : ""}`}
                      onClick={() => setSubOpen(true)}
                      data-testid="button-subscription"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {isPlanDemo && !expired
                          ? (() => {
                              const until = new Date((settings?.subscriptionPaidUntil ?? "") + "T00:00:00");
                              const today = new Date(); today.setHours(0,0,0,0);
                              const days = Math.max(0, Math.ceil((until.getTime() - today.getTime()) / 86400000));
                              return `Demo · ${days}d`;
                            })()
                          : "Suscripción"}
                      </span>
                    </Button>
                  )}
                </div>
              </header>
              <main className="flex-1 overflow-hidden print:overflow-visible print:h-auto">
                <Router />
              </main>
              <footer className="p-2 text-center text-[10px] text-muted-foreground bg-card border-t border-border/50 print:hidden flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
                <span>Techpro Computación © 2026</span>
                <span className="hidden sm:inline text-border">·</span>
                <a href="/privacy" className="hover:text-foreground underline underline-offset-2 transition-colors">Privacidad</a>
                <span className="text-border">·</span>
                <a href="/terms" className="hover:text-foreground underline underline-offset-2 transition-colors">Términos</a>
              </footer>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />

        <SubscriptionModal
          open={subOpen}
          onClose={() => setSubOpen(false)}
          blocking={false}
        />
      </TooltipProvider>
    </POSControlsProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
