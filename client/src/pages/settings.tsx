import { useState } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Store, MapPin, Phone, Mail, Lock, Printer, QrCode, Eye, EyeOff, ShieldCheck, Globe, ImagePlus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState({
    storeName: "",
    address: "",
    phone: "",
    email: "",
    adminPassword: "",
    cashierUser: "",
    cashierPassword: "",
    fiscalPrinterEnabled: false,
    fiscalPrinterPort: "COM1",
    mpEnabled: false,
    mpAccessToken: "",
    mpUserId: "",
    mpPosId: "",
    subscriptionPlan: "mensual",
    country: "argentina",
    storeImage: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  if (!isLoading && settings && !isLoaded) {
    setFormData({
      storeName: settings.storeName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      adminPassword: settings.adminPassword,
      cashierUser: settings.cashierUser || "caja",
      cashierPassword: settings.cashierPassword || "1234",
      fiscalPrinterEnabled: settings.fiscalPrinterEnabled || false,
      fiscalPrinterPort: settings.fiscalPrinterPort || "COM1",
      mpEnabled: settings.mpEnabled || false,
      mpAccessToken: settings.mpAccessToken || "",
      mpUserId: settings.mpUserId || "",
      mpPosId: settings.mpPosId || "",
      subscriptionPlan: settings.subscriptionPlan || "mensual",
      country: settings.country || "argentina",
      storeImage: settings.storeImage || "",
    });
    setIsLoaded(true);
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande (máx. 5MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setFormData((prev) => ({ ...prev, storeImage: compressed }));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData, {
      onSuccess: () => toast({ title: t.settings.updated }),
    });
  };

  if (isLoading) return <div className="p-8">{t.settings.loading}</div>;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto overflow-auto h-full">
      <h1 className="text-3xl font-display font-bold mb-8">{t.settings.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              {t.settings.generalInfo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground italic">Estos datos solo pueden ser modificados por el administrador del sistema.</p>
            <div className="grid gap-2">
              <Label htmlFor="storeName">{t.settings.storeName}</Label>
              <Input id="storeName" value={formData.storeName} readOnly disabled className="cursor-not-allowed opacity-70" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">{t.settings.address}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="address" className="pl-9 cursor-not-allowed opacity-70" value={formData.address} readOnly disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t.settings.phone}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="phone" className="pl-9 cursor-not-allowed opacity-70" value={formData.phone} readOnly disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t.settings.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" className="pl-9 cursor-not-allowed opacity-70" value={formData.email} readOnly disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4" /> Foto del local
              </Label>
              <div className="flex items-center gap-4">
                {formData.storeImage ? (
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img
                      src={formData.storeImage}
                      alt="Foto del local"
                      className="w-20 h-20 rounded-xl object-cover border border-border shadow-sm"
                      data-testid="img-store-preview"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, storeImage: "" }))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/80"
                      data-testid="button-remove-store-image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 flex-shrink-0">
                    <Store className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="storeImageInput"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                    data-testid="label-store-image-upload"
                  >
                    <ImagePlus className="w-4 h-4" />
                    {formData.storeImage ? "Cambiar foto" : "Subir foto"}
                  </label>
                  <input
                    id="storeImageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    data-testid="input-store-image"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG o WEBP · Máx. 2MB</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="country" className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> País
              </Label>
              <Select value={formData.country} onValueChange={(val) => setFormData({ ...formData, country: val })}>
                <SelectTrigger id="country" data-testid="select-country">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="argentina">🇦🇷 Argentina</SelectItem>
                  <SelectItem value="peru">🇵🇪 Perú</SelectItem>
                  <SelectItem value="bolivia">🇧🇴 Bolivia</SelectItem>
                  <SelectItem value="usa">🇺🇸 USA</SelectItem>
                  <SelectItem value="republica-dominicana">🇩🇴 República Dominicana</SelectItem>
                  <SelectItem value="francia">🇫🇷 Francia</SelectItem>
                  <SelectItem value="haiti">🇭🇹 Haití</SelectItem>
                  <SelectItem value="guatemala">🇬🇹 Guatemala</SelectItem>
                  <SelectItem value="panama">🇵🇦 Panamá</SelectItem>
                  <SelectItem value="brazil">🇧🇷 Brasil</SelectItem>
                  <SelectItem value="chile">🇨🇱 Chile</SelectItem>
                  <SelectItem value="colombia">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="españa">🇪🇸 España</SelectItem>
                  <SelectItem value="maroc">🇲🇦 Maroc</SelectItem>
                  <SelectItem value="portugal">🇵🇹 Portugal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t.settings.security}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cashierUser">{t.settings.cashierUser}</Label>
                <Input id="cashierUser" value={formData.cashierUser} onChange={(e) => setFormData({ ...formData, cashierUser: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cashierPassword">{t.settings.cashierPassword}</Label>
                <Input id="cashierPassword" type="password" value={formData.cashierPassword} onChange={(e) => setFormData({ ...formData, cashierPassword: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adminPassword">{t.settings.adminPassword}</Label>
              <Input id="adminPassword" type="password" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {t.settings.fiscalPrinter}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="fiscalPrinterEnabled">{t.settings.enableFiscal}</Label>
              <Switch
                id="fiscalPrinterEnabled"
                checked={formData.fiscalPrinterEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, fiscalPrinterEnabled: checked })}
              />
            </div>
            {formData.fiscalPrinterEnabled && (
              <div className="grid gap-2">
                <Label htmlFor="fiscalPrinterPort">{t.settings.connectionPort}</Label>
                <Input
                  id="fiscalPrinterPort"
                  value={formData.fiscalPrinterPort}
                  onChange={(e) => setFormData({ ...formData, fiscalPrinterPort: e.target.value })}
                  placeholder={t.settings.portPlaceholder}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              {t.settings.mpTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="mpEnabled" className="text-base font-semibold">{t.settings.enableMP}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.mpDesc}</p>
              </div>
              <Switch id="mpEnabled" checked={formData.mpEnabled} onCheckedChange={(checked) => setFormData({ ...formData, mpEnabled: checked })} />
            </div>

            {formData.mpEnabled && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="grid gap-2">
                  <Label htmlFor="mpAccessToken">Access Token</Label>
                  <div className="relative">
                    <Input
                      id="mpAccessToken"
                      type={showToken ? "text" : "password"}
                      value={formData.mpAccessToken}
                      onChange={(e) => setFormData({ ...formData, mpAccessToken: e.target.value })}
                      placeholder="APP_USR-..."
                      className="pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowToken(!showToken)}>
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.settings.mpTokenHint}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mpUserId">User ID (Collector ID)</Label>
                    <Input id="mpUserId" value={formData.mpUserId} onChange={(e) => setFormData({ ...formData, mpUserId: e.target.value })} placeholder="123456789" />
                    <p className="text-xs text-muted-foreground">{t.settings.mpUserIdHint}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mpPosId">External POS ID</Label>
                    <Input id="mpPosId" value={formData.mpPosId} onChange={(e) => setFormData({ ...formData, mpPosId: e.target.value })} placeholder="CAJA1" />
                    <p className="text-xs text-muted-foreground">{t.settings.mpPosIdHint}</p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">{t.settings.mpHowTitle}</p>
                  <p>{t.settings.mpStep1}</p>
                  <p>{t.settings.mpStep2}</p>
                  <p>{t.settings.mpStep3}</p>
                  <p>{t.settings.mpStep4}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Plan de Licencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="subscriptionPlan">Tipo de plan</Label>
              <Select
                value={settings?.subscriptionPlan || "mensual"}
                disabled
              >
                <SelectTrigger id="subscriptionPlan" data-testid="select-subscription-plan" className="cursor-not-allowed opacity-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Plan Demo (30 días gratis)</SelectItem>
                  <SelectItem value="mensual">Plan Mensual</SelectItem>
                  <SelectItem value="total">Plan Total (pago único)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {(settings?.subscriptionPlan || "mensual") === "total" && "En Plan Total el sistema no requiere renovación mensual y el botón de suscripción no aparece."}
                {(settings?.subscriptionPlan || "mensual") === "demo" && "Período de prueba gratuito por 30 días. Al vencer se solicita suscripción mensual."}
                {(settings?.subscriptionPlan || "mensual") === "mensual" && "Requiere renovación mensual. El botón de suscripción aparece en el header."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? t.settings.saving : t.settings.save}
        </Button>
      </form>
    </div>
  );
}
