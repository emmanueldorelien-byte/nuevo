import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/use-settings";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Package, Download, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function FinancialPage() {
  const { data: settings } = useSettings();
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"] });
  const { t } = useLanguage();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthlyData = transactions.reduce((acc: any, tx) => {
    if (tx.status === "voided") return acc;
    const date = new Date(tx.createdAt);
    const key = format(date, "yyyy-MM");
    const label = date.toLocaleString("es-ES", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = { key, month: label, sales: 0, expenses: 0, purchases: 0, transactions: [] };
    acc[key].sales += Number(tx.total);
    acc[key].transactions.push(tx);
    return acc;
  }, {});

  expenses.forEach(e => {
    const date = new Date(e.createdAt);
    const key = format(date, "yyyy-MM");
    const label = date.toLocaleString("es-ES", { month: "long", year: "numeric" });
    if (!monthlyData[key]) monthlyData[key] = { key, month: label, sales: 0, expenses: 0, purchases: 0, transactions: [] };
    if (e.type === "mercaderia") {
      monthlyData[key].purchases += Number(e.amount);
    } else {
      monthlyData[key].expenses += Number(e.amount);
    }
  });

  const chartData = Object.values(monthlyData)
    .map((d: any) => ({ ...d, profit: d.sales - d.expenses - d.purchases }))
    .sort((a: any, b: any) => a.key.localeCompare(b.key));

  const totalSales = transactions.filter(tx => tx.status !== "voided").reduce((acc, tx) => acc + Number(tx.total), 0);
  const totalExpenses = expenses.filter(e => e.type !== "mercaderia").reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPurchases = expenses.filter(e => e.type === "mercaderia").reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit = totalSales - totalExpenses - totalPurchases;

  const availableMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));

  const downloadMonthlyReport = async (overrideKey?: string) => {
    const key = overrideKey ?? selectedMonth;
    const data = monthlyData[key];
    if (!data) return;

    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const storeName = settings?.storeName || "KioscoPOS";
    const monthLabel = data.month.charAt(0).toUpperCase() + data.month.slice(1);
    const profit = data.sales - data.expenses - data.purchases;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(30, 30, 50);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${t.financial.reportSummary.toUpperCase()} - ${storeName.toUpperCase()}`, pageW / 2, 12, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${t.financial.period}: ${monthLabel}`, pageW / 2, 20, { align: "center" });
    doc.text(`${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW / 2, 26, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(t.financial.reportSummary, 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [["Concepto", t.financial.amount]],
      body: [
        [t.financial.totalSales, `$${data.sales.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`],
        [t.financial.commonExpenses, `-$${data.expenses.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`],
        [t.financial.merchandise, `-$${data.purchases.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`],
        [t.financial.netProfit, `${profit >= 0 ? "" : "-"}$${Math.abs(profit).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 30, 50] },
      bodyStyles: { halign: "right" },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
      didParseCell: (hookData) => {
        if (hookData.row.index === 3) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.textColor = profit >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      },
    });

    const salesY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(t.financial.reportSales, 14, salesY);

    autoTable(doc, {
      startY: salesY + 4,
      head: [[t.financial.date, t.financial.hour, t.financial.paymentMethod, t.financial.amount, t.financial.statusLabel]],
      body: data.transactions.map((tx: any) => {
        const d = new Date(tx.createdAt);
        return [
          format(d, "dd/MM/yyyy"),
          format(d, "HH:mm"),
          tx.paymentMethod,
          `$${Number(tx.total).toFixed(2)}`,
          tx.status === "voided" ? t.financial.voided : t.financial.completed,
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 50] },
    });

    const monthExpenses = expenses.filter(e => format(new Date(e.createdAt), "yyyy-MM") === key);
    if (monthExpenses.length > 0) {
      const expY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(t.financial.reportExpenses, 14, expY);

      autoTable(doc, {
        startY: expY + 4,
        head: [[t.financial.date, "Descripción", t.financial.type, t.financial.amount]],
        body: monthExpenses.map((e: any) => [
          format(new Date(e.createdAt), "dd/MM/yyyy"),
          e.description,
          e.type === "mercaderia" ? t.financial.merchandise : t.financial.commonExp,
          `$${Number(e.amount).toFixed(2)}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 50] },
      });
    }

    doc.save(`Informe_${storeName.replace(/\s+/g, "_")}_${key}.pdf`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col h-full overflow-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{t.financial.title}</h1>
          <p className="text-muted-foreground mt-1">{t.financial.subtitle}</p>
        </div>

        <Card className="flex items-center gap-3 p-3 rounded-2xl border-border/50 shadow-sm bg-card">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-medium border-none outline-none text-foreground"
          >
            {availableMonths.length === 0 && (
              <option value={selectedMonth}>
                {new Date(selectedMonth + "-15").toLocaleString("es-ES", { month: "long", year: "numeric" })}
              </option>
            )}
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + "-15").toLocaleString("es-ES", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => downloadMonthlyReport()} className="rounded-xl gap-2 font-semibold" disabled={!monthlyData[selectedMonth]}>
            <Download className="w-4 h-4" />
            {t.financial.download}
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.financial.totalSales}</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.financial.accumulated}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.financial.commonExpenses}</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.financial.servicesEtc}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.financial.merchandise}</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.financial.stockReplenish}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-md shadow-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.financial.netProfit}</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              ${netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.financial.netFormula}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t.financial.monthlyEvolution}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                <Legend />
                <Bar dataKey="sales"     name={t.financial.sales}    fill="hsl(var(--primary))"    radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses"  name={t.financial.expenses}  fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name={t.financial.merch}     fill="#3b82f6"                radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{t.financial.monthlyDetail}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-4">
                {chartData.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 text-sm">{t.financial.noData}</p>
                )}
                {[...chartData].reverse().map((data: any) => (
                  <div key={data.key} className="p-4 rounded-2xl bg-secondary/30 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-base capitalize">{data.month}</h4>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => downloadMonthlyReport(data.key)}>
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t.financial.sales}</span>
                        <span className="font-bold text-green-600">${data.sales.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t.financial.commonExpenses}</span>
                        <span className="font-bold text-rose-600">-${data.expenses.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t.financial.merch}</span>
                        <span className="font-bold text-blue-600">-${data.purchases.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t.financial.result}</span>
                        <span className={`font-bold ${data.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                          ${data.profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
