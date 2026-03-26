import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // --- Products ---
  
  app.get(api.products.list.path, async (req, res) => {
    const allProducts = await storage.getProducts();
    res.json(allProducts);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.products.update.input.parse(req.body);
      
      const existing = await storage.getProduct(id);
      if (!existing) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const updated = await storage.updateProduct(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getProduct(id);
    
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    await storage.deleteProduct(id);
    res.status(204).send();
  });

  app.post("/api/products/bulk", async (req, res) => {
    try {
      const items = z.array(api.products.create.input).parse(req.body);
      const created = await storage.createProductsBulk(items);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: "Invalid bulk data" });
    }
  });

  // --- Transactions ---

  app.get(api.transactions.list.path, async (req, res) => {
    const allTransactions = await storage.getTransactions();
    res.json(allTransactions);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.transactions.void.path, async (req, res) => {
    const id = Number(req.params.id);
    const transaction = await storage.voidTransaction(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(transaction);
  });

  // --- Expenses ---
  app.get(api.expenses.list.path, async (req, res) => {
    const allExpenses = await storage.getExpenses();
    res.json(allExpenses);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      res.status(201).json(expense);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // --- Closures ---
  app.get(api.closures.list.path, async (req, res) => {
    const allClosures = await storage.getClosures();
    res.json(allClosures);
  });

  app.post(api.closures.create.path, async (req, res) => {
    try {
      const input = api.closures.create.input.parse(req.body);
      const closure = await storage.createClosure(input);
      res.status(201).json(closure);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // --- Withdrawals ---
  app.get("/api/withdrawals", async (req, res) => {
    const all = await storage.getWithdrawals();
    res.json(all);
  });

  app.post("/api/withdrawals", async (req, res) => {
    try {
      const withdrawal = await storage.createWithdrawal(req.body);
      res.status(201).json(withdrawal);
    } catch (err) {
      res.status(400).json({ message: "Invalid withdrawal" });
    }
  });

  // --- MercadoPago ---
  app.post("/api/mp/push-order", async (req, res) => {
    try {
      const { total, items, externalReference } = req.body;
      const settings = await storage.getSettings();

      if (!settings.mpEnabled || !settings.mpAccessToken || !settings.mpUserId || !settings.mpPosId) {
        return res.status(400).json({ message: "MercadoPago no está configurado" });
      }

      const mpItems = items.map((item: any) => ({
        sku_number: String(item.productId),
        category: "marketplace",
        title: item.name,
        description: item.name,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        unit_measure: "unit",
        total_amount: Number(item.subtotal),
      }));

      const body = {
        external_reference: externalReference || `POS-${Date.now()}`,
        title: "Compra en " + settings.storeName,
        description: "Pago en " + settings.storeName,
        notification_url: "",
        total_amount: Number(total),
        items: mpItems,
      };

      const mpRes = await fetch(
        `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${settings.mpUserId}/pos/${settings.mpPosId}/qrs`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${settings.mpAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!mpRes.ok) {
        const err = await mpRes.json();
        return res.status(mpRes.status).json({ message: err.message || "Error en MercadoPago", detail: err });
      }

      const data = await mpRes.json();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Error interno" });
    }
  });

  app.delete("/api/mp/cancel-order", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings.mpEnabled || !settings.mpAccessToken || !settings.mpUserId || !settings.mpPosId) {
        return res.status(400).json({ message: "MercadoPago no está configurado" });
      }
      const mpRes = await fetch(
        `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${settings.mpUserId}/pos/${settings.mpPosId}/qrs`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${settings.mpAccessToken}` },
        }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Error interno" });
    }
  });

  // --- Settings ---

  app.get(api.settings.get.path, async (req, res) => {
    const settingsData = await storage.getSettings();
    res.json(settingsData);
  });

  app.put(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // --- Debts ---
  app.get("/api/debts", async (_req, res) => {
    const all = await storage.getDebts();
    res.json(all);
  });

  app.post("/api/debts", async (req, res) => {
    try {
      const { insertDebtSchema } = await import("@shared/schema");
      const input = insertDebtSchema.parse(req.body);
      const debt = await storage.createDebt(input);
      res.status(201).json(debt);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch("/api/debts/:id", async (req, res) => {
    const id = Number(req.params.id);
    const debt = await storage.updateDebt(id, req.body);
    res.json(debt);
  });

  app.delete("/api/debts/:id", async (req, res) => {
    await storage.deleteDebt(Number(req.params.id));
    res.status(204).end();
  });

  // Seed initial products if database is empty
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    await storage.createProduct({
      name: "Coca Cola 2.25L",
      barcode: "7790895000997",
      price: "2500",
      isWeight: false
    });
    await storage.createProduct({
      name: "Galletitas Oreo",
      barcode: "7622300865582",
      price: "1200",
      isWeight: false
    });
    await storage.createProduct({
      name: "Pan Flauta (por Kilo)",
      barcode: "",
      price: "1500",
      isWeight: true
    });
    await storage.createProduct({
      name: "Queso Tybo (por Kilo)",
      barcode: "",
      price: "8500",
      isWeight: true
    });
    console.log("Database seeded with sample products.");
  }
}
