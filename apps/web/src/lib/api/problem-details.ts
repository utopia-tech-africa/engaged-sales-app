export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: {
    field?: string;
    message: string;
  }[];
};

export class ApiError extends Error {
  public readonly status: number;

  public readonly problem?: ProblemDetails;

  public constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}
