import { db } from "./db";
import { 
  products, transactions, transactionItems, settings, expenses, dailyClosures, withdrawals, debts,
  type Product, type InsertProduct, 
  type Transaction, type TransactionItem, 
  type Settings, type InsertSettings,
  type Expense, type InsertExpense,
  type DailyClosure, type InsertDailyClosure,
  type Withdrawal, type InsertWithdrawal,
  type Debt, type InsertDebt
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Transactions
  getTransactions(): Promise<(Transaction & { items: any[] })[]>;
  createTransaction(transaction: {
    paymentMethod: string;
    total: string;
    items: { productId: number; quantity: string; price: string; subtotal: string }[];
  }): Promise<Transaction>;
  voidTransaction(id: number): Promise<Transaction>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  // Closures
  getClosures(): Promise<DailyClosure[]>;
  createClosure(closure: InsertDailyClosure): Promise<DailyClosure>;

  // Withdrawals
  getWithdrawals(): Promise<Withdrawal[]>;
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;

  // Debts
  getDebts(): Promise<Debt[]>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, updates: Partial<InsertDebt>): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;

  // Bulk
  createProductsBulk(products: InsertProduct[]): Promise<Product[]>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getTransactions(): Promise<(Transaction & { items: any[] })[]> {
    const allTransactions = await db.select().from(transactions);
    const items = await db.select().from(transactionItems);
    
    return allTransactions.map(t => ({
      ...t,
      items: items.filter(i => i.transactionId === t.id)
    }));
  }

  async createTransaction(data: {
    paymentMethod: string;
    total: string;
    cashReceived?: string;
    changeGiven?: string;
    items: { productId: number; quantity: string; price: string; subtotal: string }[];
  }): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      const [newTransaction] = await tx.insert(transactions).values({
        paymentMethod: data.paymentMethod,
        total: data.total,
        cashReceived: data.cashReceived || "0",
        changeGiven: data.changeGiven || "0"
      }).returning();

      if (data.items.length > 0) {
        await tx.insert(transactionItems).values(
          data.items.map(item => ({
            transactionId: newTransaction.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          }))
        );

        // Update stock
        for (const item of data.items) {
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            const newStock = (Number(product.stock) - Number(item.quantity)).toString();
            await tx.update(products).set({ stock: newStock }).where(eq(products.id, item.productId));
          }
        }
      }

      return newTransaction;
    });
  }

  async voidTransaction(id: number): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      const [updated] = await tx.update(transactions)
        .set({ status: "voided" })
        .where(eq(transactions.id, id))
        .returning();
      
      // Restore stock
      const items = await tx.select().from(transactionItems).where(eq(transactionItems.transactionId, id));
      for (const item of items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (product) {
          const newStock = (Number(product.stock) + Number(item.quantity)).toString();
          await tx.update(products).set({ stock: newStock }).where(eq(products.id, item.productId));
        }
      }
      return updated;
    });
  }

  async getSettings(): Promise<Settings> {
    const [row] = await db.select().from(settings).limit(1);
    if (!row) {
      const [newSettings] = await db.insert(settings).values({}).returning();
      return this.withLicenseStatus(newSettings);
    }
    return this.withLicenseStatus(row);
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const current = await this.getSettings();
    const [updated] = await db.update(settings).set(updates).where(eq(settings.id, current.id)).returning();
    return this.withLicenseStatus(updated);
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getClosures(): Promise<DailyClosure[]> {
    return await db.select().from(dailyClosures);
  }

  async createClosure(closure: InsertDailyClosure): Promise<DailyClosure> {
    const [newClosure] = await db.insert(dailyClosures).values(closure).returning();
    return newClosure;
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return await db.select().from(withdrawals);
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [newWithdrawal] = await db.insert(withdrawals).values(withdrawal).returning();
    return newWithdrawal;
  }

  async getDebts(): Promise<Debt[]> {
    return await db.select().from(debts);
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const [newDebt] = await db.insert(debts).values(debt).returning();
    return newDebt;
  }

  async updateDebt(id: number, updates: Partial<InsertDebt>): Promise<Debt> {
    const [updated] = await db.update(debts).set(updates).where(eq(debts.id, id)).returning();
    return updated;
  }

  async deleteDebt(id: number): Promise<void> {
    await db.delete(debts).where(eq(debts.id, id));
  }

  async createProductsBulk(data: InsertProduct[]): Promise<Product[]> {
    return await db.insert(products).values(data).returning();
  }

  private withLicenseStatus(s: Settings): Settings {
    // Sistema sin bloqueo de licencia: siempre habilitado.
    return { ...s, licenseStatus: "active" };
  }
}

export const storage = new DatabaseStorage();
