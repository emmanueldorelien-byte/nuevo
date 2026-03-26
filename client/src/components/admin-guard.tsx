import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useAdminAuth } from "@/components/admin-auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: settings } = useSettings();
  const { unlocked, unlock } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && password === settings.adminPassword) {
      unlock();
      setError(false);
      setPassword("");
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex h-full items-center justify-center bg-slate-950/5 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-sm p-8 space-y-6 rounded-3xl border-border/50 shadow-2xl bg-card">
        <div className="text-center space-y-2">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold">Área Restringida</h2>
          <p className="text-muted-foreground text-sm">Ingresá la clave de administrador para continuar</p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-pass">Clave de Acceso</Label>
            <Input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="••••••"
              className={`h-12 text-lg rounded-xl ${error ? "border-destructive ring-1 ring-destructive" : ""}`}
              autoFocus
            />
            {error && (
              <p className="text-destructive text-sm font-medium">Clave incorrecta. Intentá de nuevo.</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-base font-bold rounded-xl"
            disabled={!password}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Desbloquear
          </Button>
        </form>
      </Card>
    </div>
  );
}
