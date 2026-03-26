import { z } from 'zod';
import { 
  insertProductSchema, 
  insertSettingsSchema, 
  insertExpenseSchema, 
  insertDailyClosureSchema,
  products, 
  transactions, 
  transactionItems, 
  settings, 
  expenses, 
  dailyClosures 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(
          z.custom<typeof transactions.$inferSelect>().and(
            z.object({
              items: z.array(z.custom<typeof transactionItems.$inferSelect>())
            })
          )
        ),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: z.object({
        paymentMethod: z.string(),
        total: z.string(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.string(),
          price: z.string(),
          subtotal: z.string()
        }))
      }),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    void: {
      method: 'POST' as const,
      path: '/api/transactions/:id/void' as const,
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings' as const,
      input: insertSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses' as const,
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses' as const,
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
      },
    },
  },
  closures: {
    create: {
      method: 'POST' as const,
      path: '/api/closures' as const,
      input: insertDailyClosureSchema,
      responses: {
        201: z.custom<typeof dailyClosures.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/closures' as const,
      responses: {
        200: z.array(z.custom<typeof dailyClosures.$inferSelect>()),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
