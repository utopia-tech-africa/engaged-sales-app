"use client";

import { useMutation } from "@tanstack/react-query";
import { type ReactElement, useState } from "react";
import * as XLSX from "xlsx";

import { useActivationListActivations } from "@/lib/api/generated/client";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { parseActivationsFromOrval } from "@/lib/ops/ops-adapters";
import { getStockTargetMonitoring } from "@/lib/stock/stock-api";
import { toast } from "@/lib/toast";

const todayDateInput = (): string => new Date().toISOString().slice(0, 10);
const SELECT_EMPTY = "__select_activation__";

export default function OpsTargetsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [activationId, setActivationId] = useState("");
  const [date, setDate] = useState(todayDateInput());

  const activationsQuery = useActivationListActivations({
    query: {
      enabled: accessToken !== null,
      select: (result) => parseActivationsFromOrval(result)
    }
  });

  const monitoringMutation = useMutation({
    mutationFn: async () => getStockTargetMonitoring(accessToken ?? "", { activationId, date })
  });

  const runMonitoring = (): void => {
    if (activationId.trim().length === 0) {
      return;
    }
    monitoringMutation.mutate();
  };

  const data = monitoringMutation.data;
  const exportExcel = (): void => {
    if (data === undefined) {
      return;
    }

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        date: data.date,
        activationName: data.activationName,
        dailyTargetCases: data.dailyTargetCases,
        monthlyTargetCasesPerUser: data.monthlyTargetCasesPerUser,
        teamAchievementPercent: data.teamAchievementPercent,
        teamSize: data.summary.teamSize,
        teamDailyTargetCases: data.summary.teamDailyTargetCases,
        teamDailyCasesSold: data.summary.teamDailyCasesSold,
        teamMonthlyCasesSold: data.summary.teamMonthlyCasesSold,
        averageDailyAchievementPercent: data.summary.averageDailyAchievementPercent,
        onTargetCount: data.summary.onTargetCount,
        underperformerCount: data.supervisorSummary.underperformerCount,
        needsAttentionCount: data.supervisorSummary.needsAttentionCount,
        topPerformerName: data.supervisorSummary.topPerformer?.fullName ?? "",
        topPerformerDailyAchievementPercent:
          data.supervisorSummary.topPerformer?.dailyAchievementPercent ?? ""
      }
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const leaderboardSheet = XLSX.utils.json_to_sheet(
      data.leaderboard.map((row, index) => ({
        rank: index + 1,
        fullName: row.fullName,
        phone: row.phone,
        role: row.role,
        dailyCasesSold: row.dailyCasesSold,
        dailyTargetCases: row.dailyTargetCases,
        dailyAchievementPercent: row.dailyAchievementPercent,
        monthlyCasesSold: row.monthlyCasesSold,
        monthlyTargetCases: row.monthlyTargetCases,
        monthlyAchievementPercent: row.monthlyAchievementPercent,
        monthlyTargetContributionPercent: row.monthlyTargetContributionPercent
      }))
    );
    XLSX.utils.book_append_sheet(workbook, leaderboardSheet, "Leaderboard");

    const alertsSheet = XLSX.utils.json_to_sheet(data.underperformerAlerts);
    XLSX.utils.book_append_sheet(workbook, alertsSheet, "Underperformers");

    XLSX.writeFile(workbook, `ops-target-monitoring-${data.date}.xlsx`);
    toast.success("Daily target monitoring exported to Excel.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Daily target monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily target is fixed at 10 cases per trade developer. Monitor daily achievement, monthly
          contribution, leaderboard, and underperformer alerts.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Activation
            <Select
              value={activationId.length > 0 ? activationId : SELECT_EMPTY}
              onValueChange={(value) => {
                setActivationId(value === SELECT_EMPTY ? "" : value);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select activation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY}>Select activation</SelectItem>
                {activationsQuery.data?.map((activation) => (
                  <SelectItem key={activation.id} value={activation.id}>
                    {activation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Date
            <DatePicker value={date} onChange={setDate} placeholder="Select date" />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className={calmPrimaryButtonClass}
              onClick={runMonitoring}
              disabled={activationId.trim().length === 0 || monitoringMutation.isPending}
            >
              {monitoringMutation.isPending ? "Loading..." : "Generate summary"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            onClick={exportExcel}
            disabled={data === undefined}
          >
            Export Excel
          </button>
        </div>
      </section>

      {monitoringMutation.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load target monitoring. Check activation and date, then try again.
        </p>
      ) : null}

      {data !== undefined ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <p className="text-xs text-muted-foreground">Team achievement</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {data.teamAchievementPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <p className="text-xs text-muted-foreground">Team target / sold</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {data.summary.teamDailyTargetCases} / {data.summary.teamDailyCasesSold}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <p className="text-xs text-muted-foreground">On target</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {data.summary.onTargetCount} / {data.summary.teamSize}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <p className="text-xs text-muted-foreground">Avg daily achievement</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {data.summary.averageDailyAchievementPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
              <p className="text-xs text-muted-foreground">High-priority alerts</p>
              <p className="mt-1 text-2xl font-semibold text-destructive">
                {data.supervisorSummary.needsAttentionCount}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
            <h2 className="text-sm font-semibold text-foreground">Supervisor summary</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.supervisorSummary.topPerformer === null
                ? "No top performer yet for the selected day."
                : `${data.supervisorSummary.topPerformer.fullName} leads at ${String(data.supervisorSummary.topPerformer.dailyAchievementPercent)}% daily achievement.`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Underperformers: {data.supervisorSummary.underperformerCount} · Requires attention:{" "}
              {data.supervisorSummary.needsAttentionCount}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
            <h2 className="text-sm font-semibold text-foreground">Underperformer alerts</h2>
            {data.underperformerAlerts.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                No alerts. Everyone met the daily 10-case target.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.underperformerAlerts.map((alert) => (
                  <li
                    key={alert.userId}
                    className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground"
                  >
                    <span className="font-medium">{alert.fullName}</span> ({alert.role}) is short by{" "}
                    <span className="font-semibold">{alert.shortfallCases}</span> case(s) ·{" "}
                    {alert.dailyAchievementPercent}% achieved · priority{" "}
                    <span className="uppercase">{alert.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/80 p-4 shadow-sm dark:bg-card/50">
            <h2 className="text-sm font-semibold text-foreground">Leaderboard</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Rank</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Trade developer</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Daily sold</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">
                      Daily achievement %
                    </th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Monthly sold</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">
                      Monthly target contribution %
                    </th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">
                      Monthly achievement %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row, index) => (
                    <tr key={row.userId} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2 text-foreground">#{index + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{row.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.phone} · {row.role}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {row.dailyCasesSold} / {row.dailyTargetCases}
                      </td>
                      <td className="px-3 py-2 text-foreground">{row.dailyAchievementPercent}%</td>
                      <td className="px-3 py-2 text-foreground">
                        {row.monthlyCasesSold} / {row.monthlyTargetCases}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {row.monthlyTargetContributionPercent}%
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {row.monthlyAchievementPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
