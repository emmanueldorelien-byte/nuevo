import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Lock, CheckCircle, AlertTriangle, Bitcoin, Wallet } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
//import subscriptionQR from "@assets/WhatsApp_Image_2026-03-06_at_10.13.00_1772803512189.jpeg";

const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/Y8BXGP5FR44PC";
const WHATSAPP_NUMBER = "5493517864452";

function getCountryPricing(country: string) {
  switch (country) {
    case "argentina":
      return { amount: "30000", currency: "ARS", symbol: "$", formatted: "$ 30.000" };
    case "haiti":
      return { amount: "2000", currency: "HTG", symbol: "G", formatted: "G 2.000" };
    default:
      return { amount: "10", currency: "USD", symbol: "USD", formatted: "USD 10" };
  }
}

type PaymentMode = "argentina" | "haiti" | "international";

function getPaymentMode(country: string): PaymentMode {
  if (country === "argentina") return "argentina";
  if (country === "haiti") return "haiti";
  return "international";
}

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  blocking?: boolean;
}

export function SubscriptionModal({ open, onClose, blocking = false }: SubscriptionModalProps) {
  const { data: settings } = useSettings();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const country = settings?.country || "argentina";
  const pricing = getCountryPricing(country);
  const mode = getPaymentMode(country);
  const paymentLink = settings?.subscriptionPaymentLink || "";

  const monthName = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const whatsappMessage = encodeURIComponent(
    `Hola! Les informo que acabo de realizar el pago de la suscripción mensual correspondiente al mes de ${monthName}.\n\nLocal: ${settings?.storeName || "KioscoPOS"}\nDirección: ${settings?.address || ""}\nMonto abonado: ${pricing.formatted}\n\nQuedo a la espera de la confirmación. Gracias!`
  );

  const confirmPayment = useMutation({
    mutationFn: async () => {
      if (password !== settings?.adminPassword) {
        throw new Error("Contraseña incorrecta");
      }
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const paidUntil = lastDay.toISOString().split("T")[0];
      await apiRequest("POST", "/api/expenses", {
        description: `Suscripción servicio KioscoPOS - ${monthName}`,
        amount: pricing.amount,
        category: "Servicio",
        type: "gasto",
      });
      const res = await apiRequest("PUT", "/api/settings", { subscriptionPaidUntil: paidUntil });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setConfirmed(true);
      toast({ title: "¡Suscripción confirmada!", description: "Sistema habilitado hasta fin de mes." });
      setTimeout(() => {
        setConfirmed(false);
        setPassword("");
        onClose();
      }, 1500);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={blocking ? undefined : onClose}>
      <DialogContent
        className="sm:max-w-[420px]"
        onInteractOutside={blocking ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={blocking ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {blocking ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <CreditCard className="w-5 h-5 text-primary" />
            )}
            {blocking ? "Suscripción Vencida" : "Pagar Suscripción Mensual"}
          </DialogTitle>
        </DialogHeader>

        {blocking && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-sm text-destructive font-medium">
            Tu suscripción mensual ha vencido. Realizá el pago para continuar usando el sistema.
          </div>
        )}

        <div className="flex flex-col items-center gap-3 py-1">
          <div className="flex justify-between w-full px-3 py-2 bg-secondary/50 rounded-xl">
            <span className="font-semibold text-muted-foreground">Total mensual</span>
            <span className="font-black text-xl text-primary">{pricing.formatted}</span>
          </div>

          {mode === "argentina" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Escanea el QR con Mercado Pago u otra billetera virtual
              </p>
              <div className="p-2 bg-white rounded-2xl shadow-lg border border-border/50">
                {paymentLink ? (
                  <QRCodeSVG value={paymentLink} size={220} bgColor="#ffffff" fgColor="#000000" level="M" />
                ) : (
                  <img
  src="https://placehold.co/220x220?text=Escanear+QR"
  alt="QR de suscripción"
  className="w-[220px] h-[220px] object-contain"
/>
                )}
              </div>
            </>
          )}

          {mode === "haiti" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Elegí tu método de pago — <span className="font-semibold text-foreground">G 2.000 Gourdes</span>
              </p>
              <div className="w-full space-y-2">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjou! Mwen vle peye abònman mwa a avèk MonCash. Lokal: " + (settings?.storeName || "") + ". Tanpri ban mwen enfòmasyon yo.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                  data-testid="button-moncash"
                >
                  <Wallet className="w-4 h-4" />
                  MonCash
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjou! Mwen vle peye abònman mwa a avèk NatCash. Lokal: " + (settings?.storeName || "") + ". Tanpri ban mwen enfòmasyon yo.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
                  data-testid="button-natcash"
                >
                  <Wallet className="w-4 h-4" />
                  NatCash
                </a>
              </div>
            </>
          )}

          {mode === "international" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Elegí tu método de pago — <span className="font-semibold text-foreground">USD 10</span>
              </p>
              <div className="w-full space-y-2">
                <a
                  href={PAYPAL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#003087] hover:bg-[#002070] text-white font-semibold text-sm transition-colors"
                  data-testid="button-paypal"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                  </svg>
                  Pagar con PayPal
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello! I want to pay the monthly subscription with Crypto (USDT/BTC). Store: " + (settings?.storeName || "") + ". Please send wallet details.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
                  data-testid="button-crypto"
                >
                  <Bitcoin className="w-4 h-4" />
                  Criptomonedas (USDT / BTC)
                </a>
              </div>
            </>
          )}

          <div className="w-full space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground text-center">
              Una vez realizado el pago, confirmalo ingresando tu clave de administrador
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm transition-colors"
              data-testid="button-whatsapp-support"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Informar pago por WhatsApp
            </a>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Clave admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && confirmPayment.mutate()}
                  data-testid="input-subscription-password"
                />
              </div>
              <Button
                onClick={() => confirmPayment.mutate()}
                disabled={!password || confirmPayment.isPending || confirmed}
                data-testid="button-confirm-subscription"
              >
                {confirmed ? <CheckCircle className="w-4 h-4" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>

        {!blocking && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
