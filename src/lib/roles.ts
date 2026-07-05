export type UserRole =
  | "customer"
  | "readonly"
  | "field"
  | "manager"
  | "admin"
  | "owner";

export const ROLE_RANK: Record<UserRole, number> = {
  customer: 0,
  readonly: 1,
  field: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  readonly: "Read-only",
  field: "Tech / Field",
  manager: "Manager",
  admin: "Admin",
  owner: "Owner",
};

export function atLeast(role: UserRole, min: UserRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
