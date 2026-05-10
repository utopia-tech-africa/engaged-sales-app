import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { UpdateLocationDto } from "./dto/update-location.dto";
import type { UpdateMeDto } from "./dto/update-me.dto";
import { MeRepository } from "./me.repository";

const toProfilePatch = (
  value: UpdateMeDto
): Partial<{
  fullName: string;
  gender: "male" | "female" | "other";
  regionId: string;
}> => {
  return {
    ...(value.fullName !== undefined ? { fullName: value.fullName } : {}),
    ...(value.gender !== undefined ? { gender: value.gender } : {}),
    ...(value.regionId !== undefined ? { regionId: value.regionId } : {})
  };
};

@Injectable()
export class MeService {
  public constructor(@Inject(MeRepository) private readonly meRepository: MeRepository) {}

  public async getCurrentUser(currentUser: AuthenticatedUser) {
    const profile = await this.meRepository.getProfile(currentUser.id);
    if (!profile) {
      throw new NotFoundException("User profile not found");
    }

    return profile;
  }

  public async updateCurrentUser(currentUser: AuthenticatedUser, payload: UpdateMeDto) {
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const patch = toProfilePatch(payload);
    return this.meRepository.updateProfile(currentUser.id, patch);
  }

  public updateLocation(currentUser: AuthenticatedUser, payload: UpdateLocationDto) {
    return this.meRepository.addLocation(currentUser.id, payload.latitude, payload.longitude);
  }

  public listLocationHistory(currentUser: AuthenticatedUser, limit: number) {
    const take = Math.min(100, Math.max(1, limit));
    return this.meRepository.listLocationPingsByUser(currentUser.id, take);
  }
}
