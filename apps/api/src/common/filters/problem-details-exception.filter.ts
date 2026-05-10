import type { ArgumentsHost } from "@nestjs/common";
import { Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

type ProblemDetailsError = {
  field?: string;
  message: string;
};

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: ProblemDetailsError[];
};

type HttpRequestLike = {
  originalUrl: string;
};

type HttpResponseLike = {
  status: (statusCode: number) => {
    contentType: (value: string) => {
      json: (body: ProblemDetails) => void;
    };
  };
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { detail, errors } = this.extractDetails(exception, status);

    const body: ProblemDetails = {
      type: this.buildTypeUri(status),
      title: this.getTitle(status),
      status,
      detail,
      instance: request.originalUrl,
      timestamp: new Date().toISOString(),
      ...(errors.length > 0 ? { errors } : {})
    };

    response.status(status).contentType("application/problem+json").json(body);
  }

  private extractDetails(
    exception: unknown,
    status: number
  ): { detail: string; errors: ProblemDetailsError[] } {
    if (!(exception instanceof HttpException)) {
      return {
        detail: "An unexpected error occurred.",
        errors: []
      };
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "string") {
      return { detail: exceptionResponse, errors: [] };
    }

    if (this.isHttpExceptionObject(exceptionResponse)) {
      const { message } = exceptionResponse;
      if (Array.isArray(message)) {
        const errors = message.map((item) => ({ message: item }));
        return {
          detail: "Validation failed.",
          errors
        };
      }

      if (typeof message === "string" && message.length > 0) {
        return { detail: message, errors: [] };
      }
    }

    return {
      detail: this.getTitle(status),
      errors: []
    };
  }

  private isHttpExceptionObject(value: unknown): value is { message?: string | string[] } {
    return typeof value === "object" && value !== null;
  }

  private buildTypeUri(status: number): string {
    return `https://httpstatuses.com/${String(status)}`;
  }

  private getTitle(status: number): string {
    return HttpStatus[status] ?? "Error";
  }
}
