import { apiRequest } from "@/lib/api/http-client";

export type StockPickupPayload = {
  activationId: string;
  distributorName: string;
  pickedAt?: string;
  items: { productId: string; quantity: number; costPrice: number }[];
};

export type StockSalePayload = {
  activationId: string;
  soldAt?: string;
  items: { productId: string; quantity: number; sellingPrice: number }[];
};

export type StockDailySummaryRow = {
  productId: string;
  productName: string;
  sku: string | null;
  openingStock: number;
  stockReceived: number;
  stockSold: number;
  closingBalance: number;
  dailySalesValue: number;
  dailyCaseAchievement: number | null;
};

export type StockDailySummary = {
  date: string;
  activationId: string;
  userId: string;
  rows: StockDailySummaryRow[];
};

export type StockAdminOverview = {
  date: string;
  activationId: string;
  activationName: string;
  summary: {
    openingStock: number;
    stockReceived: number;
    stockSold: number;
    closingBalance: number;
    dailySalesValue: number;
  };
  bySku: StockDailySummaryRow[];
  byUser: {
    userId: string;
    fullName: string;
    phone: string;
    role: string;
    openingStock: number;
    stockReceived: number;
    stockSold: number;
    closingBalance: number;
    dailySalesValue: number;
  }[];
  distributorAnalytics: {
    distributorName: string;
    totalQuantityPicked: number;
    totalPickupCostValue: number;
    distinctSkus: number;
  }[];
};

export const recordStockPickup = async (token: string, payload: StockPickupPayload) =>
  apiRequest("/stock/pickups", { method: "POST", token, body: payload });

export const recordStockSale = async (token: string, payload: StockSalePayload) =>
  apiRequest("/stock/sales", { method: "POST", token, body: payload });

export const getStockDailySummary = async (
  token: string,
  args: { activationId: string; date: string }
) =>
  apiRequest<StockDailySummary>(
    `/stock/daily-summary?activationId=${encodeURIComponent(args.activationId)}&date=${encodeURIComponent(args.date)}`,
    { token }
  );

export const getStockAdminOverview = async (
  token: string,
  args: { activationId: string; date: string }
) =>
  apiRequest<StockAdminOverview>(
    `/stock/admin-overview?activationId=${encodeURIComponent(args.activationId)}&date=${encodeURIComponent(args.date)}`,
    { token }
  );
