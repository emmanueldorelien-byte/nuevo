import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  barcode: text("barcode"),
  price: text("price").notNull(),
  costPrice: text("cost_price").notNull().default("0"),
  isWeight: boolean("is_weight").default(false).notNull(),
  imageUrl: text("image_url"),
  stock: text("stock").notNull().default("0"),
  unitType: text("unit_type").notNull().default("unit"), // "unit", "kg", "box", "pack"
  promoType: text("promo_type").notNull().default("none"), // "none" | "2x1" | "3x2" | "discount"
  promoMinQty: text("promo_min_qty").notNull().default("2"),
  promoDiscountPct: text("promo_discount_pct").notNull().default("0"),
  expirationDate: text("expiration_date").notNull().default(""),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull().default("gasto"), // "gasto" or "mercaderia"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyClosures = pgTable("daily_closures", {
  id: serial("id").primaryKey(),
  totalSales: text("total_sales").notNull(),
  totalExpenses: text("total_expenses").notNull(),
  netProfit: text("net_profit").notNull(),
  cashOnHand: text("cash_on_hand").notNull().default("0"),
  closedAt: timestamp("closed_at").defaultNow().notNull(),
});

export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({ id: true, createdAt: true });
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertDailyClosureSchema = createInsertSchema(dailyClosures).omit({ id: true, closedAt: true });

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type DailyClosure = typeof dailyClosures.$inferSelect;
export type InsertDailyClosure = z.infer<typeof insertDailyClosureSchema>;

export const productsRelations = relations(products, ({ many }) => ({
  transactionItems: many(transactionItems),
}));

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("Mi Kiosco"),
  address: text("address").notNull().default("Calle Falsa 123"),
  phone: text("phone").notNull().default("12345678"),
  email: text("email").notNull().default("kiosco@ejemplo.com"),
  adminPassword: text("admin_password").notNull().default("1234"),
  cashierUser: text("cashier_user").notNull().default("caja"),
  cashierPassword: text("cashier_password").notNull().default("1234"),
  fiscalPrinterEnabled: boolean("fiscal_printer_enabled").notNull().default(false),
  fiscalPrinterPort: text("fiscal_printer_port").notNull().default("COM1"),
  isClosed: boolean("is_closed").notNull().default(false),
  openingBalance: text("opening_balance").notNull().default("0"),
  mpEnabled: boolean("mp_enabled").notNull().default(false),
  mpAccessToken: text("mp_access_token").notNull().default(""),
  mpUserId: text("mp_user_id").notNull().default(""),
  mpPosId: text("mp_pos_id").notNull().default(""),
  subscriptionAmount: text("subscription_amount").notNull().default("30000"),
  subscriptionPaymentLink: text("subscription_payment_link").notNull().default(""),
  subscriptionPaidUntil: text("subscription_paid_until").notNull().default(""),
  subscriptionPlan: text("subscription_plan").notNull().default("mensual"),
  country: text("country").notNull().default("argentina"),
  storeImage: text("store_image").notNull().default(""),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  total: text("total").notNull(),
  paymentMethod: text("payment_method").notNull(),
  cashReceived: text("cash_received").default("0"),
  changeGiven: text("change_given").default("0"),
  status: text("status").notNull().default("completed"), // "completed", "voided"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ many }) => ({
  items: many(transactionItems),
}));

export const transactionItems = pgTable("transaction_items", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => transactions.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: text("quantity").notNull(), 
  price: text("price").notNull(),
  subtotal: text("subtotal").notNull(),
});

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  product: one(products, {
    fields: [transactionItems.productId],
    references: [products.id],
  }),
}));

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  category: text("category").notNull().default("proveedor"), // "proveedor" | "servicio"
  status: text("status").notNull().default("pendiente"), // "pendiente" | "pagado"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDebtSchema = createInsertSchema(debts).omit({ id: true, createdAt: true });
export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertTransactionItemSchema = createInsertSchema(transactionItems).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type InsertTransactionItem = z.infer<typeof insertTransactionItemSchema>;

export type Settings = typeof settings.$inferSelect & {
  licenseStatus?: "active" | "warning" | "blocked";
};
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
