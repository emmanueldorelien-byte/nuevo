import { useState } from "react";
import { Calculator, Package, BarChart3, Settings, Receipt, TrendingUp, Box, MessageCircle, Lock, ShieldCheck, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useAdminAuth } from "@/components/admin-auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { data: settings } = useSettings();
  const { unlocked, unlock, lock } = useAdminAuth();
  const { t } = useLanguage();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const publicItems = [
    { title: t.nav.pos, url: "/", icon: Calculator },
  ];

  const adminItems = [
    { title: t.nav.products,   url: "/products",   icon: Package },
    { title: t.nav.inventory,  url: "/inventory",  icon: Box },
    { title: t.nav.expenses,   url: "/expenses",   icon: Receipt },
    { title: t.nav.financial,  url: "/financial",  icon: TrendingUp },
    { title: t.nav.reports,    url: "/reports",    icon: BarChart3 },
    { title: t.nav.settings,   url: "/settings",   icon: Settings },
  ];

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && password === settings.adminPassword) {
      unlock();
      setShowPasswordForm(false);
      setError(false);
      setPassword("");
      navigate("/products");
    } else {
      setError(true);
      setPassword("");
    }
  };

  const handleLock = () => {
    lock();
    navigate("/");
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6 font-display font-bold text-2xl text-primary tracking-tight">
        {settings?.storeName || "KioscoPOS"}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-6 mb-2">
            {t.nav.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="hover-elevate transition-all mx-2"
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                      <item.icon className="h-5 w-5 opacity-80" />
                      <span className="font-medium text-[15px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {unlocked && adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="hover-elevate transition-all mx-2"
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                      <item.icon className="h-5 w-5 opacity-80" />
                      <span className="font-medium text-[15px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {unlocked && (
                <SidebarMenuItem key="logout">
                  <SidebarMenuButton asChild className="mx-2 mt-1">
                    <button
                      onClick={handleLock}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all font-semibold text-[15px]"
                      data-testid="button-admin-lock"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>{t.nav.adminLogout}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem key="support">
                <SidebarMenuButton asChild className="hover-elevate transition-all mx-2">
                  <a href="https://wa.me/5493517864452" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl">
                    <MessageCircle className="h-5 w-5 opacity-80" />
                    <span className="font-medium text-[15px]">{t.nav.support}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!unlocked && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent className="px-3">
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-[15px] font-medium"
                  data-testid="button-admin-unlock"
                >
                  <Lock className="h-5 w-5 opacity-80" />
                  <span>{t.nav.adminAccess}</span>
                </button>
              ) : (
                <form onSubmit={handleUnlock} className="space-y-2 px-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t.nav.adminKey}</p>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    placeholder="••••••"
                    className={`h-10 rounded-lg text-sm ${error ? "border-destructive ring-1 ring-destructive" : ""}`}
                    autoFocus
                    data-testid="input-admin-password"
                  />
                  {error && <p className="text-destructive text-xs">{t.nav.adminWrong}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="flex-1 rounded-lg" disabled={!password} data-testid="button-confirm-unlock">
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      {t.nav.enter}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => { setShowPasswordForm(false); setError(false); setPassword(""); }}>
                      {t.nav.cancel}
                    </Button>
                  </div>
                </form>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
