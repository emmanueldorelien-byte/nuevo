import { useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { useSettings } from "@/hooks/use-settings";
import { useLanguage } from "@/contexts/language-context";
import { Card } from "@/components/ui/card";
import { format, isSameDay } from "date-fns";
import { es, enUS, fr, ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Banknote, CreditCard, QrCode, TrendingUp, Calendar, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { Language } from "@/lib/i18n";

const dateFnsLocales: Record<Language, Locale> = { es, en: enUS, fr, pt: ptBR };

export default function Reports() {
  const { data: settings } = useSettings();
  const { data: transactions = [], isLoading: loadingSales } = useTransactions();
  const { data: closures = [], isLoading: loadingClosures } = useQuery<any[]>({ queryKey: ["/api/closures"] });
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<any[]>({ queryKey: ["/api/expenses"] });
  const { data: withdrawals = [], isLoading: loadingWithdrawals } = useQuery<any[]>({ queryKey: ["/api/withdrawals"] });
  const { t, language } = useLanguage();
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const locale = dateFnsLocales[language];

  if (loadingSales || loadingClosures || loadingExpenses || loadingWithdrawals) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(t =>
    t.status !== "voided" && isSameDay(new Date(t.createdAt), new Date(filterDate + "T12:00:00"))
  );

  const filteredExpenses = expenses.filter(e =>
    isSameDay(new Date(e.createdAt), new Date(filterDate + "T12:00:00"))
  );

  const dailyClosure = closures.find(c => {
    const closureDate = new Date(c.closedAt);
    const filterDateObj = new Date(filterDate + "T12:00:00");
    return closureDate.getFullYear() === filterDateObj.getFullYear() &&
           closureDate.getMonth() === filterDateObj.getMonth() &&
           closureDate.getDate() === filterDateObj.getDate();
  });

  const totalRevenue = filteredTransactions.reduce((acc, tx) => acc + Number(tx.total), 0);
  const totalChange = filteredTransactions.filter(tx => tx.paymentMethod === "efectivo").reduce((acc, tx) => acc + Number(tx.changeGiven || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const totalWithdrawals = withdrawals.filter(w => isSameDay(new Date(w.createdAt), new Date(filterDate + "T12:00:00"))).reduce((acc, w) => acc + Number(w.amount), 0);

  const openingBalanceVal = Number(settings?.openingBalance || 0);
  const cashSales = filteredTransactions.filter(tx => tx.paymentMethod === "efectivo").reduce((acc, tx) => acc + Number(tx.total), 0);
  const calculatedCashInDrawer = openingBalanceVal + cashSales - totalChange - totalExpenses - totalWithdrawals;

  const paymentTotals = filteredTransactions.reduce((acc, tx) => {
    acc[tx.paymentMethod] = (acc[tx.paymentMethod] || 0) + Number(tx.total);
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: t.reports.cash,   value: paymentTotals["efectivo"] || 0, color: "hsl(var(--chart-1))" },
    { name: t.pos.card,       value: paymentTotals["tarjeta"] || 0,  color: "hsl(var(--chart-2))" },
    { name: "QR",             value: paymentTotals["qr"] || 0,       color: "hsl(var(--chart-3))" },
  ].filter(d => d.value > 0);

  const salesByHour = filteredTransactions.reduce((acc, tx) => {
    const hour = format(new Date(tx.createdAt), "HH:00");
    acc[hour] = (acc[hour] || 0) + Number(tx.total);
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(salesByHour).map(([hour, total]) => ({ hour, total })).sort((a, b) => a.hour.localeCompare(b.hour));

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full overflow-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.reports.title}</h1>
          <p className="text-muted-foreground mt-1 capitalize">
            {format(new Date(filterDate + "T12:00:00"), "EEEE, d MMMM", { locale })}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card p-3 rounded-2xl border border-border/50 shadow-sm">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border-none bg-transparent focus-visible:ring-0 w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="p-6 rounded-2xl border-border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-wider mb-1">{t.reports.totalSales}</p>
              <h2 className="text-3xl font-display font-bold">${totalRevenue.toFixed(2)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs mt-4 text-primary-foreground/90">{filteredTransactions.length} {t.reports.transactions}</p>
        </Card>

        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
              <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium text-sm">{t.reports.cash}</p>
          <h2 className="text-xl font-display font-bold text-foreground mt-1">${(paymentTotals["efectivo"] || 0).toFixed(2)}</h2>
        </Card>

        <Card className="p-6 rounded-2xl border-border bg-purple-100/50 dark:bg-purple-900/10 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium text-sm">{t.reports.cardQR}</p>
          <h2 className="text-xl font-display font-bold text-foreground mt-1">
            ${((paymentTotals["tarjeta"] || 0) + (paymentTotals["qr"] || 0)).toFixed(2)}
          </h2>
        </Card>

        <Card className="p-6 rounded-2xl border-border bg-rose-50 dark:bg-rose-900/10 shadow-sm border-rose-100 dark:border-rose-900/20">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-rose-100 dark:bg-rose-900/30 p-3 rounded-xl">
              <Wallet className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium text-sm">{t.reports.expenses}</p>
          <h2 className="text-xl font-display font-bold text-rose-600 dark:text-rose-400 mt-1">${totalExpenses.toFixed(2)}</h2>
        </Card>

        <Card className="p-6 rounded-2xl border-border bg-amber-50 dark:bg-amber-900/10 shadow-sm border-amber-100 dark:border-amber-900/20">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium text-sm">{t.reports.pettyCash}</p>
          <h2 className="text-xl font-display font-bold text-amber-600 dark:text-amber-400 mt-1">${calculatedCashInDrawer.toFixed(2)}</h2>
          <div className="text-[10px] mt-2 opacity-70 space-y-1">
            <p>{t.reports.opening}: ${openingBalanceVal.toFixed(2)}</p>
            <p>{t.reports.changeGiven}: -${totalChange.toFixed(2)}</p>
            <p>{t.reports.withdrawals}: -${totalWithdrawals.toFixed(2)}</p>
            {dailyClosure && (
              <p className="font-bold border-t pt-1">{t.reports.declaredAtClose}: ${Number(dailyClosure.cashOnHand).toFixed(2)}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm lg:col-span-2">
          <h3 className="font-display font-bold text-lg mb-6">{t.reports.salesByHour}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip cursor={{fill: "transparent"}} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {barData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-border bg-card shadow-sm">
          <h3 className="font-display font-bold text-lg mb-6">{t.reports.paymentMethods}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
