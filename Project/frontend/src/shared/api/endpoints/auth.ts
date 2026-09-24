import { ApiEndpoint } from './base';
import type {
  AuthSession,
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  UserSummary,
} from './dto';

/** POST /api/auth/register */
export class RegisterEndpoint extends ApiEndpoint<RegisterRequest, AuthSession> {
  readonly method = 'POST' as const;
  url() {
    return '/api/auth/register';
  }
}
export const registerEndpoint = new RegisterEndpoint();

/** POST /api/auth/login */
export class LoginEndpoint extends ApiEndpoint<LoginRequest, AuthSession> {
  readonly method = 'POST' as const;
  url() {
    return '/api/auth/login';
  }
}
export const loginEndpoint = new LoginEndpoint();

/** POST /api/auth/logout */
export class LogoutEndpoint extends ApiEndpoint<void, void> {
  readonly method = 'POST' as const;
  url() {
    return '/api/auth/logout';
  }
}
export const logoutEndpoint = new LogoutEndpoint();

/** POST /api/auth/forgot-password */
export class ForgotPasswordEndpoint extends ApiEndpoint<ForgotPasswordRequest, void> {
  readonly method = 'POST' as const;
  url() {
    return '/api/auth/forgot-password';
  }
}
export const forgotPasswordEndpoint = new ForgotPasswordEndpoint();

/** GET /api/me */
export class MeEndpoint extends ApiEndpoint<void, UserSummary> {
  readonly method = 'GET' as const;
  url() {
    return '/api/me';
  }
}
export const meEndpoint = new MeEndpoint();
