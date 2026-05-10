export type Gender = "male" | "female" | "other";
export type Role = "promoter" | "merchandizer" | "supervisor" | "admin";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  uniqueCode: string;
  role: Role;
  isActive: boolean;
  gender: Gender | null;
  regionId: string | null;
  authProvider: "credentials" | "google";
  requiresProfileCompletion: boolean;
  missingProfileFields: string[];
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResponse = {
  user: AuthUser;
} & AuthTokens;
