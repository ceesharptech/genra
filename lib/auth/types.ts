export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class OnboardingRequiredError extends Error {
  constructor(message = "Onboarding required") {
    super(message);
    this.name = "OnboardingRequiredError";
  }
}

export class AdminRequiredError extends Error {
  constructor(message = "Admin required") {
    super(message);
    this.name = "AdminRequiredError";
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionSuccess<T = void>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function actionError<T = void>(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}
