export type Role = "ADMIN" | "RESIDENT_ENGINEER";

/** What the access token carries. Kept minimal: everything else is looked up per request. */
export interface TokenPayload {
  sub: string;
  role: Role;
}

/**
 * Shape of `request.user` once the access token has been verified.
 * `authenticate` adds the email (audit snapshot), IP and user agent so services
 * that already receive the requester can record audit events without new params.
 */
export interface RequestUser extends TokenPayload {
  email?: string;
  ip?: string;
  userAgent?: string;
}
