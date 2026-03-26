import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Receipt, Plus, ShoppingBag, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es, enUS, fr, ptBR } from "date-fns/locale";
import type { Language } from "@/lib/i18n";

const dateFnsLocales: Record<Language, Locale> = { es, en: enUS, fr, pt: ptBR };

type Tab = "gasto" | "mercaderia";

export default function ExpensesPage() {
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"] });
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>("gasto");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Varios");
  const [supplier, setSupplier] = useState("");

  const locale = dateFnsLocales[language];

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDescription("");
      setAmount("");
      setSupplier("");
      toast({ title: activeTab === "mercaderia" ? t.expenses.purchaseLogged : t.expenses.expenseLogged });
    }
  });

  const handleSubmit = () => {
    if (!description || !amount) {
      toast({ title: t.expenses.fillFields, variant: "destructive" });
      return;
    }
    createExpense.mutate({
      description: activeTab === "mercaderia" && supplier ? `${description} (${supplier})` : description,
      amount,
      category: activeTab === "mercaderia" ? "Mercadería" : category,
      type: activeTab,
    });
  };

  const gastos = expenses.filter((e: any) => e.type !== "mercaderia");
  const compras = expenses.filter((e: any) => e.type === "mercaderia");

  const totalGastos = gastos.reduce((acc: number, e: any) => acc + Number(e.amount), 0);
  const totalCompras = compras.reduce((acc: number, e: any) => acc + Number(e.amount), 0);

  const comprasByMonth = compras.reduce((acc: any, e: any) => {
    const month = format(new Date(e.createdAt), "MMMM yyyy", { locale });
    if (!acc[month]) acc[month] = 0;
    acc[month] += Number(e.amount);
    return acc;
  }, {});

  const gastosByMonth = gastos.reduce((acc: any, e: any) => {
    const month = format(new Date(e.createdAt), "MMMM yyyy", { locale });
    if (!acc[month]) acc[month] = 0;
    acc[month] += Number(e.amount);
    return acc;
  }, {});

  const displayList = activeTab === "gasto" ? gastos : compras;

  return (
    <div className="p-8 max-w-6xl mx-auto overflow-auto h-full">
      <h1 className="text-3xl font-display font-bold mb-2">{t.expenses.title}</h1>
      <p className="text-muted-foreground mb-8">{t.expenses.subtitle}</p>

      <div className="flex gap-2 mb-8 p-1 bg-secondary/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("gasto")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
            activeTab === "gasto" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wallet className="w-4 h-4" />
          {t.expenses.commonExpenses}
        </button>
        <button
          onClick={() => setActiveTab("mercaderia")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all text-sm ${
            activeTab === "mercaderia" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {t.expenses.merchandise}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {activeTab === "gasto" ? t.expenses.newExpense : t.expenses.newPurchase}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>{t.expenses.description}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={activeTab === "mercaderia" ? t.expenses.exDescMerch : t.expenses.exDescExpense}
              />
            </div>
            {activeTab === "mercaderia" && (
              <div className="grid gap-2">
                <Label>{t.expenses.supplier}</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder={t.expenses.exSupplier}
                />
              </div>
            )}
            {activeTab === "gasto" && (
              <div className="grid gap-2">
                <Label>{t.expenses.category}</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t.expenses.exCategory}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t.expenses.amount}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createExpense.isPending}>
              {createExpense.isPending
                ? t.expenses.registering
                : activeTab === "mercaderia"
                  ? t.expenses.registerPurchase
                  : t.expenses.registerExpense}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {activeTab === "gasto" ? t.expenses.expensesByMonth : t.expenses.purchasesByMonth}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(activeTab === "gasto" ? gastosByMonth : comprasByMonth).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">{t.expenses.noRecordsYet}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(activeTab === "gasto" ? gastosByMonth : comprasByMonth)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([month, total]: any) => (
                      <div key={month} className="flex justify-between items-center p-3 rounded-xl bg-secondary/40 border border-border/30">
                        <span className="font-medium capitalize">{month}</span>
                        <span className={`font-bold text-lg ${activeTab === "mercaderia" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-primary/5 border border-primary/20 mt-2">
                    <span className="font-bold">{t.expenses.accumulated}</span>
                    <span className="font-black text-xl text-primary">
                      ${(activeTab === "gasto" ? totalGastos : totalCompras).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="w-4 h-4" />
                {activeTab === "gasto" ? t.expenses.recentExpenses : t.expenses.recentPurchases}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                {displayList.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">{t.expenses.noRecords}</p>
                ) : (
                  displayList.slice().reverse().map((e: any) => (
                    <div key={e.id} className="flex justify-between p-3 border-b border-border/30 items-center last:border-0">
                      <div className="flex flex-col">
                        <span className="font-medium">{e.description}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(e.createdAt), "dd/MM/yyyy HH:mm", { locale })}
                          {e.category && e.category !== "Mercadería" && ` · ${e.category}`}
                        </span>
                      </div>
                      <span className={`font-bold ${activeTab === "mercaderia" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                        -${Number(e.amount).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
