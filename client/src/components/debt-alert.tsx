import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, AlertTriangle, CheckCircle, Clock, Plus, Trash2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Debt } from "@shared/schema";

const ALERT_DAYS = 5;

function daysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dueDate: string): string {
  const [y, m, d] = dueDate.split("-");
  return `${d}/${m}/${y}`;
}

export function DebtAlert() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", dueDate: "", category: "proveedor" });

  const { data: debts = [] } = useQuery<Debt[]>({ queryKey: ["/api/debts"] });

  const pendingDebts = debts.filter((d) => d.status === "pendiente");
  const alertDebts = pendingDebts.filter((d) => daysUntilDue(d.dueDate) <= ALERT_DAYS);

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/debts/${id}`, { status: "pagado" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/debts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); },
  });

  const createDebtMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/debts", {
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      category: data.category,
      status: "pendiente",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      setForm({ description: "", amount: "", dueDate: "", category: "proveedor" });
      setShowForm(false);
      toast({ title: "Deuda registrada", description: "Se guardó correctamente." });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.dueDate) return;
    createDebtMutation.mutate(form);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-secondary transition-all"
            data-testid="button-debt-alert"
            title="Deudas y vencimientos"
          >
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            {alertDebts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {alertDebts.length}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 p-0 rounded-2xl shadow-xl border-border/50">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              Deudas y Vencimientos
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs rounded-lg"
              onClick={() => { setOpen(false); setShowForm(true); }}
              data-testid="button-add-debt"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nueva deuda
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pendingDebts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm font-medium">Sin deudas pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {pendingDebts
                  .sort((a, b) => daysUntilDue(a.dueDate) - daysUntilDue(b.dueDate))
                  .map((debt) => {
                    const days = daysUntilDue(debt.dueDate);
                    const isOverdue = days < 0;
                    const isUrgent = days <= ALERT_DAYS;
                    return (
                      <div key={debt.id} className="px-4 py-3" data-testid={`debt-item-${debt.id}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{debt.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground capitalize bg-secondary px-1.5 py-0.5 rounded-md">{debt.category}</span>
                              <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? "text-destructive" : isUrgent ? "text-amber-500" : "text-muted-foreground"}`}>
                                <Clock className="h-3 w-3" />
                                {isOverdue ? `Venció hace ${Math.abs(days)}d` : days === 0 ? "Vence hoy" : `Vence en ${days}d`}
                                {" "}({formatDate(debt.dueDate)})
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">$ {Number(debt.amount).toLocaleString("es-AR")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => markPaidMutation.mutate(debt.id)}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-debt-paid-${debt.id}`}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Pagado
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 px-0 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => deleteDebtMutation.mutate(debt.id)}
                            data-testid={`button-debt-delete-${debt.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border/50 bg-muted/30 rounded-b-2xl">
            <p className="text-[11px] text-muted-foreground text-center">
              Alerta automática {ALERT_DAYS} días antes del vencimiento
            </p>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              Nueva Deuda / Vencimiento
            </DialogTitle>
            <DialogDescription>
              Registrá una deuda o pago pendiente con su fecha límite.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-desc">Descripción</Label>
              <Input
                id="debt-desc"
                placeholder="Ej: Factura Coca-Cola, Luz, Internet"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="input-debt-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="debt-amount">Monto ($)</Label>
                <Input
                  id="debt-amount"
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  data-testid="input-debt-amount"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="debt-category">Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="debt-category" data-testid="select-debt-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="impuesto">Impuesto</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt-due">Fecha límite de pago</Label>
              <Input
                id="debt-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                data-testid="input-debt-duedate"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl"
                disabled={!form.description || !form.amount || !form.dueDate || createDebtMutation.isPending}
                data-testid="button-submit-debt"
              >
                Guardar deuda
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
