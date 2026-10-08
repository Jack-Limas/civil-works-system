export type Role = "ADMIN" | "RESIDENT_ENGINEER";

/** Shape of `request.user` once the access token has been verified. */
export interface RequestUser {
  sub: string;
  role: Role;
}
