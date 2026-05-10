export type AdminActivationCreateActivationBody = {
  name: string;
  slug?: string;
  description?: string;
  regionId?: string;
  startsAt: string;
  endsAt?: string;
  isActive?: boolean;
};
