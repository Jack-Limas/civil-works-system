export type Role = "ADMIN" | "RESIDENT_ENGINEER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}