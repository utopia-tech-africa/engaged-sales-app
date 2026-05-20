import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardEmailMarkup,
  buildDashboardExcel,
  buildDashboardPdf
} from "./report-export.util";

const payload = {
  range: { from: "2026-05-01", to: "2026-05-01" },
  activationId: null,
  regionId: null,
  kpis: {
    totalCasesSold: 10,
    totalSalesValue: 1000,
    teamAchievementPercent: 80,
    outletCoveragePercent: 55,
    routeCoveragePercent: 70
  },
  salesByCity: [{ city: "Nairobi", casesSold: 10, salesValue: 1000 }],
  salesByPromoter: [
    {
      userId: "u1",
      fullName: "User",
      phone: "1",
      role: "promoter",
      casesSold: 10,
      salesValue: 1000
    }
  ],
  salesBySku: [
    { productId: "p1", productName: "Product", sku: "SKU1", casesSold: 10, salesValue: 1000 }
  ],
  outletCoverage: { totalOutlets: 20, visitedOutlets: 11, coveragePercent: 55, byArea: [] },
  routeCoverage: {
    activeRouteUsers: 5,
    totalActiveFieldStaff: 10,
    routeCoveragePercent: 50,
    coveredGeofences: 3,
    totalActiveGeofences: 6
  },
  attendanceReport: {
    rows: [],
    summary: { total: 10, present: 8, missed: 2, late: 1, missingClockOut: 1 }
  },
  productivityReport: { dailyTargetCasesPerStaff: 10, daysInRange: 1, rows: [] },
  activeVsInactiveStaff: {
    activeFieldStaff: 10,
    inactiveFieldStaff: 2,
    activeSupervisors: 1,
    inactiveSupervisors: 0
  }
} as const;

void test("buildDashboardExcel returns a valid XLSX file", () => {
  const buffer = buildDashboardExcel(payload as never);
  assert.ok(buffer.byteLength > 100);
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
});

void test("buildDashboardPdf returns a valid PDF file", async () => {
  const buffer = await buildDashboardPdf(payload as never);
  assert.ok(buffer.byteLength > 100);
  assert.equal(buffer.subarray(0, 5).toString("utf8"), "%PDF-");
});

void test("buildDashboardEmailMarkup returns text and html", () => {
  const markup = buildDashboardEmailMarkup(payload as never);
  assert.ok(markup.text.includes("Total cases sold"));
  assert.ok(markup.html.includes("<h2>"));
});
