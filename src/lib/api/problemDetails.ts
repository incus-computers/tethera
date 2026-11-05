import { NextResponse } from "next/server";

export interface InvalidParamError {
  name: string;
  reason: string;
}

/**
 * Standard RFC 7807 / RFC 9457 Problem Details Object
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalid_params?: InvalidParamError[];
  // Backwards-compatible fields for existing clients expecting { success: false, error: string }
  success: false;
  error: string;
  [key: string]: any;
}

export interface ProblemOptions {
  type?: string;
  title?: string;
  instance?: string;
  invalid_params?: InvalidParamError[];
  extensions?: Record<string, any>;
}

const DEFAULT_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

const DEFAULT_TYPE_SLUGS: Record<number, string> = {
  400: "bad-request",
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  422: "unprocessable-entity",
  500: "internal-server-error",
};

/**
 * Creates an RFC 7807 compliant Problem Details HTTP response
 */
export function createProblemResponse(
  status: number,
  detail: string,
  options?: ProblemOptions
): NextResponse<ProblemDetails> {
  const type =
    options?.type ||
    `https://tethera.com/problems/${DEFAULT_TYPE_SLUGS[status] || "general-error"}`;
  const title = options?.title || DEFAULT_TITLES[status] || "Error";

  const problem: ProblemDetails = {
    type,
    title,
    status,
    detail,
    success: false,
    error: detail,
    ...(options?.instance ? { instance: options.instance } : {}),
    ...(options?.invalid_params ? { invalid_params: options.invalid_params } : {}),
    ...(options?.extensions || {}),
  };

  return NextResponse.json(problem, {
    status,
    headers: {
      "content-type": "application/problem+json; charset=utf-8",
    },
  });
}

export function badRequestProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(400, detail, options);
}

export function unauthorizedProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(401, detail, options);
}

export function forbiddenProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(403, detail, options);
}

export function notFoundProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(404, detail, options);
}

export function conflictProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(409, detail, options);
}

export function unprocessableEntityProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(422, detail, options);
}

export function internalServerErrorProblem(detail: string, options?: ProblemOptions) {
  return createProblemResponse(500, detail, options);
}
