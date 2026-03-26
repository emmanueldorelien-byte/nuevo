import { useState } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit2, Trash2, Lock, ImageIcon, FileUp, Download, Tag, CalendarClock } from "lucide-react";
import * as XLSX from "xlsx";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Products() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    price: "",
    costPrice: "0",
    isWeight: false,
    imageUrl: "",
    stock: "0",
    unitType: "unit",
    promoType: "none",
    promoMinQty: "2",
    promoDiscountPct: "0",
    expirationDate: "",
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", barcode: "", price: "", costPrice: "0", isWeight: false, imageUrl: "", stock: "0", unitType: "unit", promoType: "none", promoMinQty: "2", promoDiscountPct: "0", expirationDate: "" });
    setIsModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      barcode: product.barcode || "",
      price: product.price,
      costPrice: product.costPrice || "0",
      isWeight: product.isWeight,
      imageUrl: product.imageUrl || "",
      stock: product.stock || "0",
      unitType: product.unitType || "unit",
      promoType: product.promoType || "none",
      promoMinQty: product.promoMinQty || "2",
      promoDiscountPct: product.promoDiscountPct || "0",
      expirationDate: product.expirationDate || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t.products.confirmDelete)) {
      deleteProduct.mutate(id, { onSuccess: () => toast({ title: t.products.deleted }) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProduct.mutate({ id: editingId, ...formData }, {
        onSuccess: () => { setIsModalOpen(false); toast({ title: t.products.updated }); }
      });
    } else {
      createProduct.mutate(formData, {
        onSuccess: () => { setIsModalOpen(false); toast({ title: t.products.created }); }
      });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const { data: settings } = useSettings();
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  const downloadTemplate = () => {
    const template = [{ nombre: "Ejemplo Producto", codigo_barras: "123456789", precio_venta: "100.00", precio_costo: "80.00", stock: "50", es_pesable: "No", tipo_unidad: "unit" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const formattedData = (data as any[]).map(item => ({
        name: String(item.nombre || ""),
        barcode: String(item.codigo_barras || ""),
        price: String(item.precio_venta || "0"),
        costPrice: String(item.precio_costo || "0"),
        stock: String(item.stock || "0"),
        isWeight: String(item.es_pesable).toLowerCase() === "si",
        unitType: String(item.tipo_unidad || "unit"),
      })).filter(p => p.name);
      if (formattedData.length === 0) {
        toast({ title: t.products.noData, variant: "destructive" });
        return;
      }
      try {
        const res = await apiRequest("POST", "/api/products/bulk", formattedData);
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          toast({ title: `${formattedData.length} ${t.products.loadSuccess}` });
        }
      } catch {
        toast({ title: t.products.loadError, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!isAuthorized) {
    return (
      <div className="h-full flex items-center justify-center bg-secondary/30">
        <Card className="w-full max-w-md p-8 rounded-3xl shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold">{t.products.restricted}</h2>
            <p className="text-muted-foreground">{t.products.restrictedDesc}</p>
            <div className="w-full space-y-4 mt-4">
              <Input
                type="password"
                placeholder={t.products.accessKey}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="h-12 text-center text-xl tracking-widest"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (passwordInput === settings?.adminPassword) setIsAuthorized(true);
                    else toast({ title: t.nav.adminWrong, variant: "destructive" });
                  }
                }}
              />
              <Button className="w-full h-12 font-bold" onClick={() => {
                if (passwordInput === settings?.adminPassword) setIsAuthorized(true);
                else toast({ title: t.nav.adminWrong, variant: "destructive" });
              }}>
                {t.products.enter}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.products.title}</h1>
          <p className="text-muted-foreground mt-1">{t.products.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="rounded-xl shadow-md font-semibold h-11 px-4 border-primary text-primary hover:bg-primary/5">
            <Download className="w-5 h-5 mr-2" />
            {t.products.template}
          </Button>
          <div className="relative">
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <Button variant="outline" className="rounded-xl shadow-md font-semibold h-11 px-4 border-primary text-primary hover:bg-primary/5">
              <FileUp className="w-5 h-5 mr-2" />
              {t.products.importExcel}
            </Button>
          </div>
          <Button onClick={openCreate} className="rounded-xl shadow-md font-semibold h-11 px-6">
            <Plus className="w-5 h-5 mr-2" />
            {t.products.new}
          </Button>
        </div>
      </div>

      <Card className="flex-1 rounded-2xl shadow-sm border-border flex flex-col overflow-hidden bg-card">
        <div className="p-4 border-b border-border bg-secondary/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.products.search}
              className="pl-9 bg-card"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/40 sticky top-0 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="w-[100px]">{t.products.barcode}</TableHead>
                <TableHead>{t.products.name}</TableHead>
                <TableHead className="text-right">{t.products.price}</TableHead>
                <TableHead className="text-center">{t.products.stock}</TableHead>
                <TableHead className="text-center">{t.products.type}</TableHead>
                <TableHead className="text-right">{t.products.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.common.loading}
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t.products.noProducts}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-mono text-muted-foreground text-sm">{product.barcode || "-"}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold">
                      <span className={Number(product.stock) < 10 ? "text-destructive" : ""}>{product.stock}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${product.isWeight ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                        {product.isWeight ? `${t.products.kg}` : t.products.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? t.products.edit : t.products.new}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t.products.name}</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="barcode">{t.products.barcode}</Label>
                  <Input id="barcode" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">{t.products.cost} ($)</Label>
                  <Input id="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">{t.products.price} ($)</Label>
                  <Input id="price" type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock">{t.products.stock}</Label>
                  <Input id="stock" type="number" step="0.001" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t.inventory.unitType}</Label>
                  <Select value={formData.unitType} onValueChange={(v) => setFormData({ ...formData, unitType: v })}>
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

              <div className="grid gap-2">
                <Label htmlFor="imageUrl">{t.products.image}</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="imageUrl" className="pl-9" placeholder="https://..." value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-4 bg-secondary/10">
                <div className="space-y-0.5">
                  <Label>{t.products.weightProduct}</Label>
                  <p className="text-sm text-muted-foreground">{t.pos.weight}</p>
                </div>
                <Switch checked={formData.isWeight} onCheckedChange={(c) => setFormData({ ...formData, isWeight: c })} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expirationDate" className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" /> Fecha de vencimiento <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  data-testid="input-expiration-date"
                />
                {formData.expirationDate && (() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const exp = new Date(formData.expirationDate + "T00:00:00");
                  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
                  if (days < 0) return <p className="text-xs text-destructive font-semibold">⚠️ Este producto ya está vencido</p>;
                  if (days <= 7) return <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">⚠️ Vence en {days} día{days !== 1 ? "s" : ""}</p>;
                  return <p className="text-xs text-green-600 dark:text-green-400">✓ Vigente — vence en {days} días</p>;
                })()}
              </div>

              <div className="rounded-xl border p-4 bg-secondary/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <Label className="font-semibold">{t.products.promo}</Label>
                </div>
                <Select value={formData.promoType} onValueChange={(v) => setFormData({ ...formData, promoType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.products.noPromo} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.products.noPromo}</SelectItem>
                    <SelectItem value="2x1">2x1</SelectItem>
                    <SelectItem value="3x2">3x2</SelectItem>
                    <SelectItem value="discount">{t.products.promo} %</SelectItem>
                  </SelectContent>
                </Select>
                {formData.promoType === "discount" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">{t.products.promoMinQty}</Label>
                      <Input type="number" min="2" value={formData.promoMinQty} onChange={(e) => setFormData({ ...formData, promoMinQty: e.target.value })} placeholder="3" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">{t.products.promoDiscount}</Label>
                      <Input type="number" min="1" max="100" value={formData.promoDiscountPct} onChange={(e) => setFormData({ ...formData, promoDiscountPct: e.target.value })} placeholder="10" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t.nav.cancel}</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {createProduct.isPending || updateProduct.isPending ? t.products.saving : t.products.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
