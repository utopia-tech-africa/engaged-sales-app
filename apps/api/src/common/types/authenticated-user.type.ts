export type UserRole = "promoter" | "merchandizer" | "supervisor" | "admin";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  phone: string;
  sessionId: string;
};
