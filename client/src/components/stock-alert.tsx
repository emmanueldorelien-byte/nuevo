import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, AlertTriangle, PackageX } from "lucide-react";
import type { Product } from "@shared/schema";

const LOW_STOCK_THRESHOLD = 5;

export function StockAlert() {
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const outOfStock = products.filter((p) => Number(p.stock) <= 0);
  const lowStock = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= LOW_STOCK_THRESHOLD);
  const total = outOfStock.length + lowStock.length;

  if (total === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-secondary transition-all"
          data-testid="button-stock-alert"
          title="Alertas de stock"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {total}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-xl border-border/50">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas de Stock
          </h3>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
          {outOfStock.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-1">Sin stock</p>
              {outOfStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5" data-testid={`stock-alert-out-${p.id}`}>
                  <div className="flex items-center gap-2">
                    <PackageX className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    {Number(p.stock)} {p.unitType === "kg" ? "kg" : "u."}
                  </span>
                </div>
              ))}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 mb-1">Stock bajo (≤{LOW_STOCK_THRESHOLD})</p>
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5" data-testid={`stock-alert-low-${p.id}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium truncate max-w-[180px]">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {Number(p.stock)} {p.unitType === "kg" ? "kg" : "u."}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 rounded-b-2xl">
          <p className="text-[11px] text-muted-foreground text-center">
            Actualizá el inventario en la sección <strong>Inventario</strong>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
