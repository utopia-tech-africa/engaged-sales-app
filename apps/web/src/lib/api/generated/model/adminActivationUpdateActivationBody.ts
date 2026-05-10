export type AdminActivationUpdateActivationBody = {
  name?: string;
  slug?: string;
  description?: string;
  regionId?: string;
  startsAt?: string;
  endsAt?: string | null;
  isActive?: boolean;
};
