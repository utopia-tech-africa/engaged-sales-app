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
}
