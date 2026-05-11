import { apiRequest } from "@/lib/api/http-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000/api/v1";

export type ReportingDashboardResponse = {
  range: { from: string; to: string };
  activationId: string | null;
  regionId: string | null;
  kpis: {
    totalCasesSold: number;
    totalSalesValue: number;
    teamAchievementPercent: number;
    outletCoveragePercent: number;
    routeCoveragePercent: number;
  };
  salesByCity: { city: string; casesSold: number; salesValue: number }[];
  salesByPromoter: {
    userId: string;
    fullName: string;
    phone: string;
    role: string;
    casesSold: number;
    salesValue: number;
  }[];
  salesBySku: {
    productId: string;
    productName: string;
    sku: string | null;
    casesSold: number;
    salesValue: number;
  }[];
  outletCoverage: {
    totalOutlets: number;
    visitedOutlets: number;
    coveragePercent: number;
    byArea: { area: string; visited: number }[];
  };
  routeCoverage: {
    activeRouteUsers: number;
    totalActiveFieldStaff: number;
    routeCoveragePercent: number;
    coveredGeofences: number;
    totalActiveGeofences: number;
  };
  attendanceReport: {
    summary: {
      total: number;
      present: number;
      missed: number;
      late: number;
      missingClockOut: number;
    };
  };
  productivityReport: {
    dailyTargetCasesPerStaff: number;
    daysInRange: number;
    rows: {
      userId: string;
      fullName: string;
      phone: string;
      role: string;
      casesSold: number;
      salesValue: number;
      targetCases: number;
      achievementPercent: number;
    }[];
  };
  activeVsInactiveStaff: {
    activeFieldStaff: number;
    inactiveFieldStaff: number;
    activeSupervisors: number;
    inactiveSupervisors: number;
  };
};

export type ReportSettings = {
  timezone: string;
  dailyEnabled: boolean;
  dailyCron: string;
  weeklyEnabled: boolean;
  weeklyCron: string;
  recipients: { email: string; frequency: "daily" | "weekly" }[];
};

type FilterArgs = {
  from?: string;
  to?: string;
  activationId?: string;
  regionId?: string;
};

const buildQuery = (args: FilterArgs): string => {
  const params = new URLSearchParams();
  if (args.from !== undefined && args.from.length > 0) {
    params.set("from", args.from);
  }
  if (args.to !== undefined && args.to.length > 0) {
    params.set("to", args.to);
  }
  if (args.activationId !== undefined && args.activationId.length > 0) {
    params.set("activationId", args.activationId);
  }
  if (args.regionId !== undefined && args.regionId.length > 0) {
    params.set("regionId", args.regionId);
  }
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : "";
};

export const getReportingDashboard = async (token: string, args: FilterArgs) =>
  apiRequest<ReportingDashboardResponse>(`/reports/dashboard${buildQuery(args)}`, { token });

export const getReportingSettings = async (token: string) =>
  apiRequest<ReportSettings>("/reports/settings", { token });

export const updateReportingSettings = async (
  token: string,
  payload: {
    timezone: string;
    dailyEnabled: boolean;
    dailyCron: string;
    weeklyEnabled: boolean;
    weeklyCron: string;
    recipients: string[];
  }
) => apiRequest<ReportSettings>("/reports/settings", { token, method: "PUT", body: payload });

const downloadReport = async (
  token: string,
  path: string,
  fallbackFilename: string
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error("Could not export report");
  }
  const contentDisposition = response.headers.get("Content-Disposition");
  const extractedName = contentDisposition?.match(/filename="([^"]+)"/)?.[1];
  const filename = extractedName ?? fallbackFilename;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportReportingDashboardExcel = async (
  token: string,
  args: FilterArgs
): Promise<void> =>
  downloadReport(
    token,
    `/reports/dashboard/export.xlsx${buildQuery(args)}`,
    `reporting-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`
  );

export const exportReportingDashboardPdf = async (token: string, args: FilterArgs): Promise<void> =>
  downloadReport(
    token,
    `/reports/dashboard/export.pdf${buildQuery(args)}`,
    `reporting-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`
  );
