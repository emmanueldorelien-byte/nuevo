import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Trash2, Scale, Banknote, CreditCard, QrCode, ImageIcon, History, Mic } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { usePOSControls } from "@/contexts/pos-controls-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type Product = ReturnType<typeof useProducts>["data"][0];

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

function playSaleCompletedSound() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(
    "Cobro completado. Gracias por su compra. Hasta luego.",
  );
  utterance.lang = "es-ES";

  const voices = window.speechSynthesis.getVoices();
  const femaleEsVoice =
    // Forzar voz Microsoft Sabina si está disponible
    voices.find((v) => v.name === "Microsoft Sabina") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("es")) ||
    null;

  if (femaleEsVoice) {
    utterance.voice = femaleEsVoice;
  }

  utterance.rate = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function POS() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings, refetch: refetchSettings } = useSettings();
  const { data: transactions = [] } = useTransactions();
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"] });
  const createTransaction = useCreateTransaction();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { historyOpen: historyModalOpen, setHistoryOpen: setHistoryModalOpen, closureOpen: closureModalOpen, setClosureOpen: setClosureModalOpen } = usePOSControls();

  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "qr">("efectivo");
  const [cashReceived, setCashReceived] = useState("");

  // Login State
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // Void/History State
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [voidPassword, setVoidPassword] = useState("");

  // Mobile view toggle
  const [mobileView, setMobileView] = useState<"products" | "ticket">("products");

  // Weight Modal State
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState("");

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    items: CartItem[];
    total: number;
    paymentMethod: string;
    date: Date;
    cashReceived?: number;
  } | null>(null);

  // Daily Closure State
  const [cashInDrawer, setCashInDrawer] = useState("");

  // MercadoPago QR State
  const [mpWaitingOpen, setMpWaitingOpen] = useState(false);
  const [mpCartSnapshot, setMpCartSnapshot] = useState<CartItem[]>([]);
  const [mpTotalSnapshot, setMpTotalSnapshot] = useState(0);
  const [mpPushing, setMpPushing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const createClosure = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/closures", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Caja cerrada correctamente" });
      setClosureModalOpen(false);
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("PUT", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    }
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    }
  });

  const handleOpenCashRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === settings?.cashierUser && loginPass === settings?.cashierPassword) {
      if (!openingBalance || Number(openingBalance) < 0) {
        toast({ title: "Ingrese un monto de apertura válido", variant: "destructive" });
        return;
      }
      updateSettings.mutate({ 
        isClosed: false,
        openingBalance: openingBalance
      });
      setLoginUser("");
      setLoginPass("");
      setOpeningBalance("");
      toast({ title: "Caja abierta" });
    } else {
      toast({ title: "Usuario o clave incorrectos", variant: "destructive" });
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep focus on search input for barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Búsqueda por voz no soportada",
        description: "Tu navegador no soporta reconocimiento de voz.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast({ title: "Escuchando...", description: "Di el nombre del producto." });
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Error al escuchar",
        description: "No se pudo capturar la voz.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchTerm(text);
      // Reusar la lógica de búsqueda actual
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSearchSubmit(fakeEvent);
      }, 50);
    };

    recognition.start();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;

    // Direct match (barcode exact match)
    const match = products.find((p) => p.barcode === searchTerm || p.name.toLowerCase() === searchTerm.toLowerCase());

    if (match) {
      handleProductSelect(match);
      setSearchTerm(""); // clear after success
    } else {
      toast({ title: "Producto no encontrado", variant: "destructive" });
    }
  };

  const calculatePromoSubtotal = (product: any, quantity: number): number => {
    const price = Number(product.price);
    const promoType = product.promoType;
    if (!promoType || promoType === "none") return price * quantity;

    if (promoType === "2x1") {
      // Every 2 you pay 1
      const paid = Math.ceil(quantity / 2);
      return paid * price;
    }
    if (promoType === "3x2") {
      // Every 3 you pay 2
      const groups = Math.floor(quantity / 3);
      const remainder = quantity % 3;
      return (groups * 2 + remainder) * price;
    }
    if (promoType === "discount") {
      const minQty = Number(product.promoMinQty) || 2;
      const pct = Number(product.promoDiscountPct) || 0;
      if (quantity >= minQty && pct > 0) {
        return quantity * price * (1 - pct / 100);
      }
    }
    return price * quantity;
  };

  const getPromoLabel = (product: any, quantity: number): string | null => {
    const promoType = product.promoType;
    if (!promoType || promoType === "none") return null;
    if (promoType === "2x1" && quantity >= 2) {
      const free = Math.floor(quantity / 2);
      return `🔥 2x1 — ${free} gratis`;
    }
    if (promoType === "3x2" && quantity >= 3) {
      const free = Math.floor(quantity / 3);
      return `🔥 3x2 — ${free} gratis`;
    }
    if (promoType === "discount") {
      const minQty = Number(product.promoMinQty) || 2;
      const pct = Number(product.promoDiscountPct) || 0;
      if (quantity >= minQty && pct > 0) return `🟢 ${pct}% OFF aplicado`;
    }
    return null;
  };

  const handleProductSelect = (product: Product) => {
    if (product.isWeight) {
      setSelectedWeightProduct(product);
      setWeightInput("");
      setWeightModalOpen(true);
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    if (window.innerWidth < 768) setMobileView("ticket");
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);

      if (existing && !product.isWeight) {
        const newQty = existing.quantity + quantity;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, subtotal: calculatePromoSubtotal(product, newQty) }
            : item
        );
      }

      return [...prev, { product, quantity, subtotal: calculatePromoSubtotal(product, quantity) }];
    });
  };

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(weightInput);
    if (qty > 0 && selectedWeightProduct) {
      addToCart(selectedWeightProduct, qty);
      setWeightModalOpen(false);
      setSelectedWeightProduct(null);
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const change = paymentMethod === "efectivo" ? Math.max(0, Number(cashReceived) - total) : 0;

  useEffect(() => {
    const lowStockProducts = products.filter(p => Number(p.stock) < 10);
    if (lowStockProducts.length > 0) {
      toast({
        title: t.pos.lowStockAlert,
        description: (
          <div className="flex flex-col gap-2">
            <span>{lowStockProducts.length} {t.pos.lowStockMsg}</span>
            <Button
              variant="outline"
              size="sm"
              className="w-fit h-7 text-xs"
              onClick={() => window.location.href = "/inventory"}
            >
              {t.pos.viewInventory}
            </Button>
          </div>
        ),
        variant: "destructive",
      });
    }
  }, [products.length]);

  const completeTransactionNow = (cartItems: CartItem[], totalAmount: number, method: string, cash: number) => {
    createTransaction.mutate(
      {
        total: totalAmount.toFixed(2),
        paymentMethod: method,
        cashReceived: method === "efectivo" ? cash.toString() : "0",
        changeGiven: method === "efectivo" ? Math.max(0, cash - totalAmount).toFixed(2) : "0",
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity.toString(),
          price: item.product.price,
          subtotal: item.subtotal.toFixed(2)
        }))
      },
      {
        onSuccess: () => {
          playSaleCompletedSound();
          setLastTransaction({
            items: cartItems,
            total: totalAmount,
            paymentMethod: method,
            date: new Date(),
            cashReceived: cash
          });
          setCart([]);
          setCashReceived("");
          setReceiptModalOpen(true);
          setMpWaitingOpen(false);
          toast({ title: t.pos.saleCompleted });
        }
      }
    );
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    // If QR + MercadoPago enabled, push order to device first
    if (paymentMethod === "qr" && settings?.mpEnabled) {
      setMpPushing(true);
      try {
        const res = await apiRequest("POST", "/api/mp/push-order", {
          total: total,
          externalReference: `POS-${Date.now()}`,
          items: cart.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: Number(item.product.price),
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        });
        if (!res.ok) {
          const err = await res.json();
          toast({ title: "Error MercadoPago", description: err.message, variant: "destructive" });
          setMpPushing(false);
          return;
        }
        setMpCartSnapshot([...cart]);
        setMpTotalSnapshot(total);
        setMpWaitingOpen(true);
        setMpPushing(false);
      } catch {
        toast({ title: t.pos.sendingMP, variant: "destructive" });
        setMpPushing(false);
      }
      return;
    }

    completeTransactionNow(cart, total, paymentMethod, Number(cashReceived));
  };

  const handleMpConfirmPayment = () => {
    completeTransactionNow(mpCartSnapshot, mpTotalSnapshot, "qr", 0);
  };

  const handleMpCancelOrder = async () => {
    try {
      await apiRequest("DELETE", "/api/mp/cancel-order", {});
    } catch {}
    setMpWaitingOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVoidTransaction = async () => {
    if (voidPassword !== settings?.adminPassword) {
      toast({ title: t.pos.wrongKey, variant: "destructive" });
      return;
    }

    try {
      await apiRequest("POST", `/api/transactions/${selectedTransactionId}/void`);
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({ title: t.pos.saleVoided });
      setVoidConfirmOpen(false);
      setHistoryModalOpen(false);
      setVoidPassword("");
    } catch (err) {
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  if (settings?.isClosed) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 p-6">
        <Card className="w-full max-w-md p-8 space-y-6 rounded-3xl border-border/50 shadow-2xl bg-card">
          <div className="text-center space-y-2">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold">{t.pos.closedTitle}</h1>
            <p className="text-muted-foreground">{t.pos.closedDesc}</p>
          </div>
          <form onSubmit={handleOpenCashRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">{t.pos.user}</Label>
              <Input
                id="user"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                placeholder={t.pos.user}
                className="h-12 text-lg rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">{t.pos.password}</Label>
              <Input
                id="pass"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="****"
                className="h-12 text-lg rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">{t.pos.openingAmount}</Label>
              <Input
                id="openingBalance"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg rounded-xl font-bold"
              />
            </div>
            <Button type="submit" className="w-full h-14 text-xl font-bold rounded-xl" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? t.pos.opening : t.pos.openRegister}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-3 md:gap-6 p-3 md:p-6 bg-secondary/30 dark:bg-slate-950 transition-colors">
      {/* MOBILE TAB SWITCHER */}
      <div className="flex md:hidden gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileView("products")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${mobileView === "products" ? "bg-primary text-white shadow-md" : "bg-card text-muted-foreground border border-border"}`}
          data-testid="tab-products"
        >
          <Search className="w-4 h-4" /> Productos
        </button>
        <button
          onClick={() => setMobileView("ticket")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all relative ${mobileView === "ticket" ? "bg-primary text-white shadow-md" : "bg-card text-muted-foreground border border-border"}`}
          data-testid="tab-ticket"
        >
          <ShoppingCart className="w-4 h-4" /> Ticket
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* MERCADOPAGO WAITING DIALOG */}
      <Dialog open={mpWaitingOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-500" />
              {t.pos.qr} — MercadoPago
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
              <QrCode className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-2xl text-primary">${mpTotalSnapshot.toFixed(2)}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t.pos.sendingMP}</p>
            </div>
            <div className="flex items-center gap-2 justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t.pos.processing}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMpConfirmPayment}
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? t.pos.processing : t.pos.confirm}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleMpCancelOrder}>
              {t.nav.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DAILY CLOSURE MODAL */}
      <Dialog open={closureModalOpen} onOpenChange={setClosureModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t.pos.dailyClosure}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.pos.closureDesc}
            </p>
            <div className="space-y-2">
              <Label htmlFor="cashInDrawer">{t.pos.cashInDrawer}</Label>
              <Input
                id="cashInDrawer"
                type="number"
                value={cashInDrawer}
                onChange={(e) => setCashInDrawer(e.target.value)}
                placeholder="0.00"
                className="text-2xl h-12 font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosureModalOpen(false)}>{t.nav.cancel}</Button>
            <Button 
              variant="destructive" 
              disabled={!cashInDrawer || createClosure.isPending}
              onClick={() => {
                const todayTransactions = transactions.filter(tx => 
                  tx.status !== "voided" && 
                  new Date(tx.createdAt).toDateString() === new Date().toDateString()
                );
                const totalSalesVal = todayTransactions.reduce((acc, tx) => acc + Number(tx.total), 0).toString();
                
                // Get total expenses for today
                const todayExpenses = expenses.filter(e => 
                  new Date(e.createdAt).toDateString() === new Date().toDateString()
                ).reduce((acc, e) => acc + Number(e.amount), 0);

                const totalSalesNum = Number(totalSalesVal);
                const netProfit = (totalSalesNum - todayExpenses).toString();

                const openingBalanceVal = Number(settings?.openingBalance || 0);
                const cashSales = todayTransactions
                  .filter(tx => tx.paymentMethod === "efectivo")
                  .reduce((acc, tx) => acc + Number(tx.total), 0);
                const totalChange = todayTransactions
                  .filter(tx => tx.paymentMethod === "efectivo")
                  .reduce((acc, tx) => acc + Number(tx.changeGiven || 0), 0);
                
                // Caja Chica Esperada = Apertura + Ventas Efectivo - Vueltos - Gastos
                const expectedCash = openingBalanceVal + cashSales - totalChange - todayExpenses;
                const physicalCash = Number(cashInDrawer || 0);
                const difference = expectedCash - physicalCash;

                // Si hay faltante, registrar como retiro automático
                if (difference > 0) {
                  createWithdrawalMutation.mutate({
                    description: `Retiro en caja (Diferencia) - Cierre ${format(new Date(), "dd/MM/yyyy")}`,
                    amount: difference.toFixed(2)
                  });
                }
                
                createClosure.mutate({
                  totalSales: totalSalesVal,
                  totalExpenses: todayExpenses.toString(),
                  netProfit: netProfit,
                  cashOnHand: cashInDrawer
                }, {
                  onSuccess: () => {
                    setCashInDrawer("");
                    updateSettings.mutate({ isClosed: true });
                  }
                });
              }}
            >
              {createClosure.isPending ? t.pos.closing : t.pos.confirmClose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* LEFT PANE: Products */}
      <div className={`${mobileView === "products" ? "flex" : "hidden"} md:flex flex-1 flex-col gap-4 md:gap-6 overflow-hidden`}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.pos.search}
            className="pl-12 pr-12 h-14 text-lg rounded-2xl bg-card border-border shadow-sm focus-visible:ring-primary/20"
            autoFocus
          />
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors ${
              isListening
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary bg-transparent"
            }`}
            title="Buscar por voz"
          >
            <Mic className="w-4 h-4" />
          </button>
        </form>

        <ScrollArea className="flex-1 rounded-2xl">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="bg-card p-0 rounded-3xl text-left border border-border/50 shadow-sm hover:border-primary/50 hover:shadow-xl transition-all active:scale-[0.98] group relative overflow-hidden flex flex-col h-full"
                >
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 translate-y-2 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 bg-primary px-2 py-0.5 rounded-full">{t.pos.add}</span>
                    </div>
                    {(product as any).promoType && (product as any).promoType !== "none" && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[11px] font-black text-white px-2 py-1 rounded-full shadow-lg ${
                          (product as any).promoType === "discount"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}>
                          {(product as any).promoType === "2x1" ? "🔥 2x1" :
                           (product as any).promoType === "3x2" ? "🔥 3x2" :
                           `🟢 ${(product as any).promoDiscountPct}% OFF x${(product as any).promoMinQty}+`}
                        </span>
                      </div>
                    )}
                    {(product as any).expirationDate && (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const exp = new Date((product as any).expirationDate + "T00:00:00");
                      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
                      if (days < 0) return (
                        <div className="absolute top-2 right-2 z-10">
                          <span className="text-[10px] font-black text-white bg-destructive px-2 py-1 rounded-full shadow-lg">⚠️ VENCIDO</span>
                        </div>
                      );
                      if (days <= 7) return (
                        <div className="absolute top-2 right-2 z-10">
                          <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-1 rounded-full shadow-lg">⏰ {days}d</span>
                        </div>
                      );
                      return null;
                    })()}
                  </div>
                  
                  <div className="p-4 relative z-10 flex flex-col flex-1">
                    <h3 className="font-bold text-card-foreground leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <div className="flex justify-between items-end mt-auto">
                      <span className="text-xl font-display font-black text-primary">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-60">
                        {product.isWeight ? (
                          <Scale className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-current" />
                        )}
                        <span className="text-[10px] font-bold uppercase">{product.isWeight ? t.pos.kg : t.pos.un}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT PANE: Ticket */}
      <Card className={`${mobileView === "ticket" ? "flex" : "hidden"} md:flex md:w-[400px] w-full flex-col rounded-3xl border-border/50 shadow-xl overflow-hidden bg-card`}>
        <div className="px-5 py-3 bg-primary/5 border-b border-border/50 flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg text-foreground">{t.pos.ticket}</h2>
        </div>

        <ScrollArea className="flex-1 min-h-0 p-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 mt-20">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-[1.5]" />
              <p>{t.pos.empty}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((item, idx) => {
                const normalSubtotal = Number(item.product.price) * item.quantity;
                const savings = normalSubtotal - item.subtotal;
                const promoLabel = getPromoLabel(item.product, item.quantity);
                return (
                <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${promoLabel ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50' : 'bg-secondary/50 border-border/30 hover:border-border'}`}>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-semibold text-sm text-foreground truncate">{item.product.name}</h4>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} {item.product.isWeight ? 'kg' : 'un'} × ${Number(item.product.price).toFixed(2)}
                    </div>
                    {promoLabel && (
                      <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                        {promoLabel} {savings > 0 && <span>(-${savings.toFixed(2)})</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {savings > 0 && (
                        <div className="text-[11px] text-muted-foreground line-through">${normalSubtotal.toFixed(2)}</div>
                      )}
                      <span className={`font-display font-bold text-base ${savings > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>${item.subtotal.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => removeFromCart(idx)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-muted-foreground font-medium text-lg">{t.pos.total}</span>
              {(() => {
                const totalSavings = cart.reduce((acc, item) => acc + Math.max(0, Number(item.product.price) * item.quantity - item.subtotal), 0);
                return totalSavings > 0 ? (
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400">{t.pos.savings} ${totalSavings.toFixed(2)} {t.pos.withPromos}</div>
                ) : null;
              })()}
            </div>
            <span className="font-display font-bold text-4xl text-primary">${total.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => { setPaymentMethod("efectivo"); setCashReceived(""); }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'efectivo' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary'}`}
            >
              <Banknote className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">{t.pos.cash}</span>
            </button>
            <button
              onClick={() => { setPaymentMethod("tarjeta"); setCashReceived(""); }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'tarjeta' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary'}`}
            >
              <CreditCard className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">{t.pos.card}</span>
            </button>
            <button
              onClick={() => { setPaymentMethod("qr"); setCashReceived(""); }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'qr' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80 hover:bg-secondary'}`}
            >
              <QrCode className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">{t.pos.qr}</span>
            </button>
          </div>

          {paymentMethod === "efectivo" && (
            <div className="space-y-2 mb-3 p-3 rounded-2xl bg-secondary/30 border border-border/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">{t.pos.payWith}</Label>
                <div className="relative w-32">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    value={cashReceived} 
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="pl-6 h-9 text-right font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-primary">
                <span className="text-sm font-bold">{t.pos.change}</span>
                <span className="text-xl font-black">${change.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Button 
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98]"
              size="lg"
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || createTransaction.isPending || mpPushing || (paymentMethod === "efectivo" && Number(cashReceived) < total)}
            >
              {mpPushing ? t.pos.sendingMP : createTransaction.isPending ? t.pos.processing : t.pos.charge}
            </Button>
          </div>
        </div>
      </Card>

      {/* RECENT SALES / VOID MODAL */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t.pos.recentSales}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-3">
              {transactions.filter(tx => tx.status !== "voided").sort((a,b) => b.id - a.id).slice(0, 20).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/10">
                  <div>
                    <div className="font-bold">{t.pos.sale} #{tx.id}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "HH:mm - dd/MM")}</div>
                    <div className="text-sm font-semibold text-primary mt-1">${Number(tx.total).toFixed(2)}</div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      setSelectedTransactionId(tx.id);
                      setVoidConfirmOpen(true);
                    }}
                  >
                    {t.pos.void}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* VOID CONFIRMATION MODAL */}
      <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t.pos.voidSale} #{selectedTransactionId}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>{t.pos.voidAdminKey}</Label>
              <Input 
                type="password" 
                value={voidPassword} 
                onChange={(e) => setVoidPassword(e.target.value)}
                placeholder="****"
                className="text-center text-2xl h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidConfirmOpen(false)}>{t.nav.cancel}</Button>
            <Button variant="destructive" onClick={handleVoidTransaction}>{t.pos.void}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WEIGHT PROMPT MODAL */}
      <Dialog open={weightModalOpen} onOpenChange={setWeightModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleWeightSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">{t.pos.weightTitle}</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <Label className="text-muted-foreground mb-2 block">
                Producto: <span className="font-semibold text-foreground">{selectedWeightProduct?.name}</span>
              </Label>
              <div className="relative">
                <Input
                  autoFocus
                  type="number"
                  step="0.001"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="pl-4 pr-12 h-16 text-3xl font-display"
                  placeholder="0.000"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  KG
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWeightModalOpen(false)}>
                {t.nav.cancel}
              </Button>
              <Button type="submit">{t.pos.confirm}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECEIPT MODAL & PRINTABLE AREA */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t.pos.saleCompleted}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-center text-muted-foreground mb-6">
              ¿Desea imprimir el comprobante?
            </p>
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setReceiptModalOpen(false)}>
                {t.common.close}
              </Button>
              <Button className="flex-1" onClick={handlePrint}>
                {t.pos.ticket}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PRINT ONLY RECEIPT VIEW */}
      {lastTransaction && settings && (
        <div id="printable-receipt" className="hidden print:block fixed top-0 left-0 w-[58mm] bg-white text-black font-mono text-[11px] leading-tight z-[9999]">
          <div className="text-center font-bold text-lg mb-1 uppercase">{settings.storeName}</div>
          <div className="text-center text-[10px] mb-2">
            <div>{settings.address}</div>
            <div>Tel: {settings.phone}</div>
            {settings.email && <div>{settings.email}</div>}
          </div>
          <div className="text-center mb-4 border-b border-black border-dashed pb-2">
            <div>Comprobante No Fiscal</div>
            <div>{format(lastTransaction.date, "dd/MM/yyyy HH:mm")}</div>
          </div>
          
          <table className="w-full mb-4 table-fixed">
            <thead>
              <tr className="border-b border-black border-dashed text-left">
                <th className="py-1 text-[10px] w-[9mm]">Cant</th>
                <th className="py-1 text-[10px]">Desc</th>
                <th className="py-1 text-[10px] text-right w-[16mm]">Total</th>
              </tr>
            </thead>
            <tbody>
              {lastTransaction.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 align-top text-[10px]">{item.quantity}</td>
                  <td className="py-1 align-top text-[10px] pr-1 break-words whitespace-normal">{item.product.name}</td>
                  <td className="py-1 align-top text-[10px] text-right whitespace-nowrap">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="border-t border-black border-dashed pt-2 mb-4">
            <div className="flex justify-between font-bold text-[14px]">
              <span>TOTAL:</span>
              <span>${lastTransaction.total.toFixed(2)}</span>
            </div>
            {lastTransaction.paymentMethod === "efectivo" && lastTransaction.cashReceived !== undefined && (
              <>
                <div className="flex justify-between mt-1 text-[10px]">
                  <span>Entregado:</span>
                  <span>${lastTransaction.cashReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-0.5 text-[10px] font-bold">
                  <span>Vuelto:</span>
                  <span>${(lastTransaction.cashReceived - lastTransaction.total).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between mt-1 text-gray-700">
              <span>Medio:</span>
              <span className="uppercase">{lastTransaction.paymentMethod}</span>
            </div>
          </div>
          
          <div className="text-center mt-6 text-[10px]">
            ¡Gracias por su compra!
          </div>
        </div>
      )}

    </div>
  );
}
