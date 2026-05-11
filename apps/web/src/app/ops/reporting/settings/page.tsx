"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { type ReactElement, useMemo, useState } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { calmPrimaryButtonClass } from "@/lib/calm-ui";
import { getReportingSettings, updateReportingSettings } from "@/lib/reports/reports-api";
import { toast } from "@/lib/toast";

export default function OpsReportingSettingsPage(): ReactElement {
  const accessToken = useAuthStore((state) => state.accessToken);
  const settingsQuery = useQuery({
    queryKey: ["ops", "reporting-settings"],
    queryFn: async () => getReportingSettings(accessToken ?? ""),
    enabled: accessToken !== null
  });

  const initialRecipients = useMemo(
    () =>
      [...new Set((settingsQuery.data?.recipients ?? []).map((row) => row.email))]
        .sort((a, b) => a.localeCompare(b))
        .join(", "),
    [settingsQuery.data?.recipients]
  );

  const [timezone, setTimezone] = useState("");
  const [dailyEnabled, setDailyEnabled] = useState<boolean | null>(null);
  const [dailyCron, setDailyCron] = useState("");
  const [weeklyEnabled, setWeeklyEnabled] = useState<boolean | null>(null);
  const [weeklyCron, setWeeklyCron] = useState("");
  const [recipientsInput, setRecipientsInput] = useState("");
  const [hasEditedRecipients, setHasEditedRecipients] = useState(false);

  const timezoneValue = timezone.length > 0 ? timezone : (settingsQuery.data?.timezone ?? "UTC");
  const dailyEnabledValue = dailyEnabled ?? settingsQuery.data?.dailyEnabled ?? false;
  const dailyCronValue =
    dailyCron.length > 0 ? dailyCron : (settingsQuery.data?.dailyCron ?? "0 0 19 * * *");
  const weeklyEnabledValue = weeklyEnabled ?? settingsQuery.data?.weeklyEnabled ?? false;
  const weeklyCronValue =
    weeklyCron.length > 0 ? weeklyCron : (settingsQuery.data?.weeklyCron ?? "0 0 19 * * 1");
  const recipientsValue = hasEditedRecipients ? recipientsInput : initialRecipients;

  const saveMutation = useMutation({
    mutationFn: async () =>
      updateReportingSettings(accessToken ?? "", {
        timezone: timezoneValue.trim(),
        dailyEnabled: dailyEnabledValue,
        dailyCron: dailyCronValue.trim(),
        weeklyEnabled: weeklyEnabledValue,
        weeklyCron: weeklyCronValue.trim(),
        recipients: recipientsValue
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0)
      }),
    onSuccess: (updated) => {
      setTimezone(updated.timezone);
      setDailyEnabled(updated.dailyEnabled);
      setDailyCron(updated.dailyCron);
      setWeeklyEnabled(updated.weeklyEnabled);
      setWeeklyCron(updated.weeklyCron);
      setRecipientsInput(
        [...new Set(updated.recipients.map((row) => row.email))]
          .sort((a, b) => a.localeCompare(b))
          .join(", ")
      );
      setHasEditedRecipients(true);
      toast.success("Reporting settings updated.");
    },
    onError: () => {
      toast.error("Could not save reporting settings.");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reporting settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure daily automated reports and weekly summary reports sent by email.
        </p>
      </div>
      <section className="space-y-4 rounded-xl border border-border bg-card/80 p-5 shadow-sm dark:bg-card/50">
        <label className="block text-xs font-medium text-muted-foreground">
          Timezone
          <input
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={timezoneValue}
            onChange={(event) => {
              setTimezone(event.target.value);
            }}
            placeholder="Africa/Nairobi"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Daily cron
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={dailyCronValue}
              onChange={(event) => {
                setDailyCron(event.target.value);
              }}
              placeholder="0 0 19 * * *"
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Weekly cron
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={weeklyCronValue}
              onChange={(event) => {
                setWeeklyCron(event.target.value);
              }}
              placeholder="0 0 19 * * 1"
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-muted-foreground">
          Recipient emails (comma-separated)
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={recipientsValue}
            onChange={(event) => {
              setHasEditedRecipients(true);
              setRecipientsInput(event.target.value);
            }}
            placeholder="ops@example.com, supervisor@example.com"
          />
        </label>

        <div className="flex flex-wrap items-center gap-5">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dailyEnabledValue}
              onChange={(event) => {
                setDailyEnabled(event.target.checked);
              }}
            />
            Enable daily report
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={weeklyEnabledValue}
              onChange={(event) => {
                setWeeklyEnabled(event.target.checked);
              }}
            />
            Enable weekly summary
          </label>
        </div>

        <button
          type="button"
          className={calmPrimaryButtonClass}
          disabled={saveMutation.isPending || settingsQuery.isLoading}
          onClick={() => {
            saveMutation.mutate();
          }}
        >
          {saveMutation.isPending ? "Saving..." : "Save settings"}
        </button>
      </section>
    </div>
  );
}
