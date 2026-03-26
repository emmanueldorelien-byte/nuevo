import { useState } from "react";
import { useProducts, useUpdateProduct } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, AlertTriangle, ListFilter } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function InventoryPage() {
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [stockToAdd, setStockToAdd] = useState("");
  const [unitType, setUnitType] = useState("unit");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const lowStockProducts = products.filter(p => Number(p.stock) < 10);
  const displayedProducts = showLowStockOnly ? lowStockProducts : products;

  const handleAddStock = () => {
    const product = products.find(p => p.id === Number(selectedProductId));
    if (!product) return;

    const currentStock = Number(product.stock || 0);
    const newStock = (currentStock + Number(stockToAdd)).toString();

    const unitLabel =
      unitType === "unit" ? t.inventory.unitUnit :
      unitType === "kg"   ? t.inventory.unitKg :
      unitType === "box"  ? t.inventory.unitBox :
      t.inventory.unitPack;

    updateProduct.mutate({ id: product.id, stock: newStock, unitType }, {
      onSuccess: () => {
        toast({
          title: t.inventory.updated,
          description: `${t.inventory.updatedDesc1} ${stockToAdd} ${unitLabel} ${t.inventory.updatedDesc2} ${product.name}.`
        });
        setStockToAdd("");
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto overflow-auto h-full">
      <h1 className="text-3xl font-display font-bold mb-8">{t.inventory.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t.inventory.addStockTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{t.inventory.product}</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder={t.inventory.selectProduct} />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name} (Stock: {p.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t.inventory.qtyToAdd}</Label>
              <Input
                type="number"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.inventory.unitType}</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit">{t.inventory.unitUnit}</SelectItem>
                  <SelectItem value="kg">{t.inventory.unitKg}</SelectItem>
                  <SelectItem value="box">{t.inventory.unitBox}</SelectItem>
                  <SelectItem value="pack">{t.inventory.unitPack}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAddStock} className="w-full h-12 text-lg font-bold" disabled={!selectedProductId || !stockToAdd}>
            <Plus className="w-5 h-5 mr-2" />
            {t.inventory.registerEntry}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <ListFilter className="w-6 h-6 text-primary" />
            {t.inventory.stockList}
          </h2>
          <Button
            variant={showLowStockOnly ? "destructive" : "outline"}
            className="rounded-xl flex items-center gap-2"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          >
            <AlertTriangle className="w-4 h-4" />
            {showLowStockOnly ? t.inventory.showingLowStock : t.inventory.filterLowStock}
          </Button>
        </div>

        <Card className="rounded-2xl overflow-hidden border-border/50">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead>{t.inventory.product}</TableHead>
                <TableHead className="text-center">{t.inventory.currentStock}</TableHead>
                <TableHead className="text-center">{t.inventory.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    {showLowStockOnly ? t.inventory.noProductsLow : t.inventory.noProducts}
                  </TableCell>
                </TableRow>
              ) : (
                displayedProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center font-bold">{p.stock}</TableCell>
                    <TableCell className="text-center">
                      {Number(p.stock) < 10 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          {t.inventory.lowStock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t.inventory.sufficient}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
