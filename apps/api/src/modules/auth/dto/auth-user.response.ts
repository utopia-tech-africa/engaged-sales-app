import type { User } from "../../../generated/prisma/client";

export type AuthUserResponse = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  uniqueCode: string;
  role: User["role"];
  gender: User["gender"];
  regionId: string | null;
  authProvider: User["authProvider"];
  requiresProfileCompletion: boolean;
  missingProfileFields: string[];
  createdAt: string;
  updatedAt: string;
};
