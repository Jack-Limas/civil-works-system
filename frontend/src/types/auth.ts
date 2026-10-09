export type Role = "ADMIN" | "RESIDENT_ENGINEER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** True after an admin created the account or reset its password */
  mustChangePassword?: boolean;
  phone?: string | null;
  lastLoginAt?: string | null;
}
