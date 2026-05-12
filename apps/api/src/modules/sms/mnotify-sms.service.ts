import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvironmentVariables } from "../../config/environment";

const MNOTIFY_LEGACY_SMS_URL = "https://apps.mnotify.net/smsapi";

/** Success body returned by legacy mNotify single-SMS API (plain text). */
const MNOTIFY_LEGACY_SUCCESS_CODE = "1000";

const MNOTIFY_V2_QUICK_SMS_URL = "https://api.mnotify.com/api/sms/quick";

/**
 * SMS via **mNotify**: current keys use **v2** (`api.mnotify.com` POST). Older keys may need
 * `MNOTIFY_API_VERSION=legacy` (GET `apps.mnotify.net/smsapi`).
 */
@Injectable()
export class MnotifySmsService {
  private readonly logger = new Logger(MnotifySmsService.name);

  public constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  /**
   * Sends invite instructions to the user's phone. Throws if SMS cannot be delivered
   * (missing config, provider error, or network failure).
   * National numbers starting with `0` are treated as Ghana (`+233`) for mNotify routing.
   */
  public async sendUserInviteSms(params: {
    phone: string;
    fullName: string;
    uniqueCode: string;
    role: string;
  }): Promise<void> {
    const apiKey = this.configService.get("MNOTIFY_SMS_API_KEY", { infer: true }).trim();
    if (apiKey.length === 0) {
      throw new BadRequestException(
        "User invites require SMS: set MNOTIFY_SMS_API_KEY or MNOTIFY_KEY on the API server."
      );
    }

    const senderRaw = this.configService.get("MNOTIFY_SENDER_ID", { infer: true }).trim();
    const senderId = (senderRaw.length > 0 ? senderRaw : "Engaged").slice(0, 11);

    const appUrl = this.configService
      .get("APP_PUBLIC_URL", { infer: true })
      .trim()
      .replace(/\/$/, "");
    const signInUrl = `${appUrl}/auth/sign-in`;
    const message = MnotifySmsService.buildInviteSmsBody({ ...params, signInUrl });
    const to = MnotifySmsService.normalizeRecipientMsisdn(params.phone);

    const version = this.configService.get("MNOTIFY_API_VERSION", { infer: true });
    if (version === "legacy") {
      await this.sendLegacyGetSms({ apiKey, senderId, to, message });
    } else {
      await this.sendV2QuickSms({ apiKey, senderId, to, message });
    }
  }

  private async sendV2QuickSms(params: {
    apiKey: string;
    senderId: string;
    to: string;
    message: string;
  }): Promise<void> {
    const url = new URL(MNOTIFY_V2_QUICK_SMS_URL);
    url.searchParams.set("key", params.apiKey);

    try {
      const form = new URLSearchParams();
      form.append("recipient[0]", params.to);
      form.append("sender", params.senderId);
      form.append("message", params.message);
      form.append("is_schedule", "false");
      form.append("schedule_date", "");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: form.toString()
      });

      const rawText = await response.text();
      let json: unknown;
      try {
        json = rawText.length > 0 ? (JSON.parse(rawText) as unknown) : {};
      } catch {
        this.logger.error(`mNotify v2 non-JSON response (HTTP ${String(response.status)})`);
        throw new ServiceUnavailableException(
          "SMS provider returned an unexpected response. Try again later."
        );
      }

      const payload = json as { status?: string; message?: string };
      if (!response.ok) {
        this.logger.error(
          `mNotify v2 invite SMS HTTP ${String(response.status)}: ${rawText.slice(0, 300)}`
        );
        throw new ServiceUnavailableException(
          payload.message ??
            `SMS provider returned HTTP ${String(response.status)}. Try again later.`
        );
      }
      if (payload.status !== "success") {
        const detail = payload.message ?? "Invite SMS was not accepted.";
        this.logger.error(`mNotify v2 invite SMS rejected: ${detail}`);
        throw new BadRequestException(detail);
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(
        "Failed to send invite SMS via mNotify v2",
        err instanceof Error ? err.stack : String(err)
      );
      throw new ServiceUnavailableException(
        err instanceof Error ? err.message : "Could not reach the SMS provider."
      );
    }
  }

  private async sendLegacyGetSms(params: {
    apiKey: string;
    senderId: string;
    to: string;
    message: string;
  }): Promise<void> {
    const url = new URL(MNOTIFY_LEGACY_SMS_URL);
    url.searchParams.set("key", params.apiKey);
    url.searchParams.set("to", params.to);
    url.searchParams.set("msg", params.message);
    url.searchParams.set("sender_id", params.senderId);

    try {
      const response = await fetch(url.toString(), { method: "GET" });
      const body = (await response.text()).trim();
      if (!response.ok) {
        this.logger.error(
          `mNotify legacy invite SMS HTTP ${String(response.status)}: ${body.slice(0, 200)}`
        );
        throw new ServiceUnavailableException(
          `SMS provider returned HTTP ${String(response.status)}. Try again later.`
        );
      }
      if (body !== MNOTIFY_LEGACY_SUCCESS_CODE) {
        const hint = mnotifyLegacyErrorHint(body);
        this.logger.error(`mNotify legacy invite SMS rejected (code ${body}): ${hint}`);
        throw new BadRequestException(
          body === "1004"
            ? `${hint} If your key is from the current mNotify dashboard, remove MNOTIFY_API_VERSION=legacy or set MNOTIFY_API_VERSION=v2.`
            : `Invite SMS was not accepted (${body}): ${hint}.`
        );
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(
        "Failed to send invite SMS via mNotify legacy",
        err instanceof Error ? err.stack : String(err)
      );
      throw new ServiceUnavailableException(
        err instanceof Error ? err.message : "Could not reach the SMS provider."
      );
    }
  }

  private static buildInviteSmsBody(params: {
    fullName: string;
    phone: string;
    uniqueCode: string;
    role: string;
    signInUrl: string;
  }): string {
    const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1);
    return [
      `Hi ${params.fullName}, your Engaged Sales account is ready (${roleLabel}).`,
      `Sign in: ${params.signInUrl}`,
      `Phone: ${params.phone}`,
      `Access code: ${params.uniqueCode}`,
      "If you did not expect this, ignore this SMS."
    ].join(" ");
  }

  /**
   * Digits only; leading `0` national → `233` (Ghana) when not already country-prefixed.
   */
  private static normalizeRecipientMsisdn(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) {
      return phone;
    }
    if (digits.startsWith("233")) {
      return digits;
    }
    if (digits.startsWith("0")) {
      return `233${digits.slice(1)}`;
    }
    return digits;
  }
}

function mnotifyLegacyErrorHint(code: string): string {
  switch (code) {
    case "1002":
      return "message not sent";
    case "1003":
      return "insufficient balance";
    case "1004":
      return "invalid API key for legacy endpoint.";
    case "1005":
      return "invalid phone number";
    case "1006":
      return "invalid sender ID";
    case "1008":
      return "empty message";
    default:
      return "see mNotify API docs";
  }
}
