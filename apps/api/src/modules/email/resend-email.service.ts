import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

import type { EnvironmentVariables } from "../../config/environment";

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly client: Resend | null;

  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    const apiKey = this.configService.get("RESEND_API_KEY", { infer: true }).trim();
    this.client = apiKey.length > 0 ? new Resend(apiKey) : null;
  }

  public async sendUserInviteEmail(params: {
    to: string;
    fullName: string;
    phone: string;
    uniqueCode: string;
    role: string;
  }): Promise<void> {
    if (!this.client) {
      this.logger.warn("RESEND_API_KEY is not set; skipping user invite email.");
      return;
    }

    const configuredFrom = this.configService.get("RESEND_FROM_EMAIL", { infer: true }).trim();
    const appUrl = this.configService
      .get("APP_PUBLIC_URL", { infer: true })
      .trim()
      .replace(/\/$/, "");
    const signInUrl = `${appUrl}/auth/sign-in`;
    const from =
      configuredFrom.length > 0 ? configuredFrom : "Engaged Sales <onboarding@resend.dev>";

    try {
      const { error } = await this.client.emails.send({
        from,
        to: params.to,
        subject: "Your Engaged Sales account",
        html: ResendEmailService.buildInviteHtml({ ...params, signInUrl }),
        text: ResendEmailService.buildInviteText({ ...params, signInUrl })
      });
      if (error) {
        this.logger.error(`Resend rejected invite email: ${error.message}`);
      }
    } catch (err: unknown) {
      this.logger.error(
        "Failed to send invite email",
        err instanceof Error ? err.stack : String(err)
      );
    }
  }

  /** Operational / reporting email to one or more recipients (e.g. attendance digest). */
  public async sendOperationalEmail(params: {
    to: string[];
    subject: string;
    html: string;
    text: string;
    attachments?: { filename: string; content: string; type: string }[];
  }): Promise<void> {
    const uniqueRecipients = [
      ...new Set(params.to.map((e) => e.trim()).filter((e) => e.length > 0))
    ];
    if (!this.client) {
      this.logger.warn("RESEND_API_KEY is not set; skipping operational email.");
      return;
    }
    if (uniqueRecipients.length === 0) {
      this.logger.warn("No recipients for operational email; skipping.");
      return;
    }

    const configuredFrom = this.configService.get("RESEND_FROM_EMAIL", { infer: true }).trim();
    const from =
      configuredFrom.length > 0 ? configuredFrom : "Engaged Sales <onboarding@resend.dev>";

    try {
      const { error } = await this.client.emails.send({
        from,
        to: uniqueRecipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
        ...(params.attachments !== undefined && params.attachments.length > 0
          ? { attachments: params.attachments }
          : {})
      });
      if (error) {
        this.logger.error(`Resend rejected operational email: ${error.message}`);
      }
    } catch (err: unknown) {
      this.logger.error(
        "Failed to send operational email",
        err instanceof Error ? err.stack : String(err)
      );
    }
  }

  private static buildInviteHtml(params: {
    fullName: string;
    phone: string;
    uniqueCode: string;
    role: string;
    signInUrl: string;
  }): string {
    const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
    return `
      <p>Hi ${escapeHtml(params.fullName)},</p>
      <p>An Engaged Sales account was created for you as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p>Sign in at <a href="${escapeHtml(params.signInUrl)}">${escapeHtml(params.signInUrl)}</a> using:</p>
      <ul>
        <li><strong>Phone:</strong> ${escapeHtml(params.phone)}</li>
        <li><strong>Access code:</strong> ${escapeHtml(params.uniqueCode)}</li>
        <li><strong>Role:</strong> ${escapeHtml(params.role)}</li>
      </ul>
      <p>If you did not expect this message, you can ignore it.</p>
    `.trim();
  }

  private static buildInviteText(params: {
    fullName: string;
    phone: string;
    uniqueCode: string;
    role: string;
    signInUrl: string;
  }): string {
    return [
      `Hi ${params.fullName},`,
      "",
      `An Engaged Sales account was created for you as a ${params.role}.`,
      "",
      `Sign in: ${params.signInUrl}`,
      `Phone: ${params.phone}`,
      `Access code: ${params.uniqueCode}`,
      `Role: ${params.role}`,
      "",
      "If you did not expect this message, you can ignore it."
    ].join("\n");
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
