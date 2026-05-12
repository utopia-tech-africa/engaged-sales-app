import { z } from "zod";

import { unwrapOrvalResponseBody } from "@/lib/auth/orval-auth-adapter";

const activationRegionLinkFieldSchema = z.object({
  regionId: z.string(),
  region: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
  })
});

export const fieldActivationListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  regionLinks: z.array(activationRegionLinkFieldSchema).optional().default([]),
  _count: z.object({ products: z.number() }).optional()
});

export type FieldActivationListItem = z.infer<typeof fieldActivationListItemSchema>;

export const fieldActivationProductSchema = z.object({
  id: z.string(),
  activationId: z.string(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number(),
  sortOrder: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type FieldActivationProduct = z.infer<typeof fieldActivationProductSchema>;

export const fieldActivationDetailSchema = fieldActivationListItemSchema.extend({
  products: z.array(fieldActivationProductSchema).optional(),
  roster: z.array(z.unknown()).optional()
});

export type FieldActivationDetail = z.infer<typeof fieldActivationDetailSchema>;

export const fieldActivationProductsPageSchema = z.object({
  data: z.array(fieldActivationProductSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number()
});

export type FieldActivationProductsPage = z.infer<typeof fieldActivationProductsPageSchema>;

const saleLineProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable().optional()
});

export const saleRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  activationId: z.string(),
  idempotencyKey: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  createdAt: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      saleId: z.string(),
      productId: z.string(),
      quantity: z.number(),
      unitPrice: z.number().nullable().optional(),
      product: saleLineProductSchema
    })
  ),
  activation: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
  })
});

export type SaleRecord = z.infer<typeof saleRecordSchema>;

export const parseFieldActivationListFromOrval = (result: unknown): FieldActivationListItem[] => {
  return z.array(fieldActivationListItemSchema).parse(unwrapOrvalResponseBody(result));
};

export const parseFieldActivationDetailFromOrval = (result: unknown): FieldActivationDetail => {
  return fieldActivationDetailSchema.parse(unwrapOrvalResponseBody(result));
};

export const parseFieldActivationProductsPageFromOrval = (
  result: unknown
): FieldActivationProductsPage => {
  return fieldActivationProductsPageSchema.parse(unwrapOrvalResponseBody(result));
};

export const parseSaleRecordFromOrval = (result: unknown): SaleRecord => {
  return saleRecordSchema.parse(unwrapOrvalResponseBody(result));
};

export const parseMySalesListFromOrval = (result: unknown): SaleRecord[] => {
  return z.array(saleRecordSchema).parse(unwrapOrvalResponseBody(result));
};
