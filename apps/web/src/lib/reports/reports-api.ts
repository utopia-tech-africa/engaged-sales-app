import { apiRequest, apiRequestBlob } from "@/lib/api/http-client";

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

const parseContentDispositionFilename = (header: string | null): string | undefined => {
  if (header === null) {
    return undefined;
  }
  const quoted = (/filename="([^"]+)"/.exec(header))?.[1];
  if (quoted !== undefined) {
    return quoted;
  }
  const unquoted = (/filename=([^;\s]+)/.exec(header))?.[1];
  return unquoted;
};

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const assertPdfBlob = async (blob: Blob): Promise<Blob> => {
  const headerBytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const header = String.fromCharCode(...headerBytes);
  if (!header.startsWith("%PDF-")) {
    throw new Error("Downloaded file is not a valid PDF. Try again or contact support.");
  }
  if (blob.type === "application/pdf") {
    return blob;
  }
  return new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
};

/** XLSX files are ZIP archives and must start with PK (0x50 0x4b). */
const assertXlsxBlob = async (blob: Blob): Promise<Blob> => {
  const headerBytes = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (headerBytes[0] !== 0x50 || headerBytes[1] !== 0x4b) {
    throw new Error("Downloaded file is not a valid Excel workbook. Try again or contact support.");
  }
  if (blob.type === XLSX_MIME) {
    return blob;
  }
  return new Blob([await blob.arrayBuffer()], { type: XLSX_MIME });
};

const downloadReportBlob = async (
  token: string,
  path: string,
  fallbackFilename: string,
  options?: { assertPdf?: boolean; assertXlsx?: boolean }
): Promise<void> => {
  const { blob, contentDisposition } = await apiRequestBlob(path, { token });
  const filename = parseContentDispositionFilename(contentDisposition) ?? fallbackFilename;
  let downloadBlob = blob;
  if (options?.assertPdf === true) {
    downloadBlob = await assertPdfBlob(blob);
  } else if (options?.assertXlsx === true) {
    downloadBlob = await assertXlsxBlob(blob);
  }
  triggerBlobDownload(downloadBlob, filename);
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

export const exportReportingDashboardExcel = async (
  token: string,
  args: FilterArgs
): Promise<void> =>
  downloadReportBlob(
    token,
    `/reports/dashboard/export.xlsx${buildQuery(args)}`,
    `reporting-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`,
    { assertXlsx: true }
  );

export const exportReportingDashboardPdf = async (token: string, args: FilterArgs): Promise<void> =>
  downloadReportBlob(
    token,
    `/reports/dashboard/export.pdf${buildQuery(args)}`,
    `reporting-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`,
    { assertPdf: true }
  );
