import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

type DashboardPayload = Awaited<
  ReturnType<import("./reports.service").ReportsService["getDashboard"]>
>;

export const buildDashboardExcel = (payload: DashboardPayload): Buffer => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([payload.kpis]), "Summary");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.salesByCity),
    "SalesByCity"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.salesByPromoter),
    "SalesByPromoter"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.salesBySku),
    "SalesBySku"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        totalOutlets: payload.outletCoverage.totalOutlets,
        visitedOutlets: payload.outletCoverage.visitedOutlets,
        coveragePercent: payload.outletCoverage.coveragePercent
      }
    ]),
    "OutletCoverage"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.outletCoverage.byArea),
    "OutletCoverageByArea"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([payload.routeCoverage]),
    "RouteCoverage"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.attendanceReport.rows),
    "Attendance"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(payload.productivityReport.rows),
    "Productivity"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([payload.activeVsInactiveStaff]),
    "StaffStatus"
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

export const buildDashboardPdf = async (payload: DashboardPayload): Promise<Buffer> => {
  const lines = [
    "Engaged Sales Reporting Dashboard",
    `Range: ${payload.range.from} to ${payload.range.to}`,
    "",
    "Summary",
    `- Total cases sold: ${String(payload.kpis.totalCasesSold)}`,
    `- Total sales value: ${String(payload.kpis.totalSalesValue)}`,
    `- Team achievement %: ${String(payload.kpis.teamAchievementPercent)}`,
    `- Outlet coverage %: ${String(payload.kpis.outletCoveragePercent)}`,
    `- Route coverage %: ${String(payload.kpis.routeCoveragePercent)}`,
    "",
    "Top Promoters",
    ...payload.salesByPromoter
      .slice(0, 10)
      .map(
        (row) => `- ${row.fullName}: ${String(row.casesSold)} cases (${String(row.salesValue)})`
      ),
    "",
    "Sales by SKU",
    ...payload.salesBySku
      .slice(0, 10)
      .map(
        (row) => `- ${row.productName}: ${String(row.casesSold)} cases (${String(row.salesValue)})`
      ),
    "",
    "Attendance",
    `- Present: ${String(payload.attendanceReport.summary.present)}`,
    `- Missed: ${String(payload.attendanceReport.summary.missed)}`,
    `- Late: ${String(payload.attendanceReport.summary.late)}`,
    `- Missing clock-out: ${String(payload.attendanceReport.summary.missingClockOut)}`
  ];
  return createSimplePdf(lines);
};

export const buildDashboardEmailMarkup = (
  payload: DashboardPayload
): { html: string; text: string } => {
  const text = [
    "Engaged Sales Reporting Dashboard",
    `Range: ${payload.range.from} to ${payload.range.to}`,
    "",
    `Total cases sold: ${String(payload.kpis.totalCasesSold)}`,
    `Total sales value: ${String(payload.kpis.totalSalesValue)}`,
    `Team achievement: ${String(payload.kpis.teamAchievementPercent)}%`,
    `Outlet coverage: ${String(payload.kpis.outletCoveragePercent)}%`,
    `Route coverage: ${String(payload.kpis.routeCoveragePercent)}%`,
    "",
    `Active field staff: ${String(payload.activeVsInactiveStaff.activeFieldStaff)}`,
    `Inactive field staff: ${String(payload.activeVsInactiveStaff.inactiveFieldStaff)}`
  ].join("\n");
  const html = [
    "<h2>Engaged Sales Reporting Dashboard</h2>",
    `<p><strong>Range:</strong> ${escapeHtml(payload.range.from)} to ${escapeHtml(payload.range.to)}</p>`,
    "<ul>",
    `<li>Total cases sold: ${String(payload.kpis.totalCasesSold)}</li>`,
    `<li>Total sales value: ${String(payload.kpis.totalSalesValue)}</li>`,
    `<li>Team achievement: ${String(payload.kpis.teamAchievementPercent)}%</li>`,
    `<li>Outlet coverage: ${String(payload.kpis.outletCoveragePercent)}%</li>`,
    `<li>Route coverage: ${String(payload.kpis.routeCoveragePercent)}%</li>`,
    "</ul>",
    "<p>Top promoters:</p>",
    "<ul>",
    ...payload.salesByPromoter
      .slice(0, 5)
      .map((row) => `<li>${escapeHtml(row.fullName)} - ${String(row.casesSold)} cases</li>`),
    "</ul>"
  ].join("");
  return { html, text };
};

const createSimplePdf = (lines: string[]): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("error", (error) => {
      reject(error);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.fontSize(11);
    for (const line of lines) {
      if (line.length === 0) {
        doc.moveDown(0.6);
        continue;
      }
      doc.text(line);
    }
    doc.end();
  });

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
