export type UserRole = "promoter" | "client" | "supervisor" | "admin";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  phone: string;
  sessionId: string;
};
