import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { UpdateLocationDto } from "./dto/update-location.dto";
import type { UpdateMeDto } from "./dto/update-me.dto";
import { type LocationPingHistoryRow, MeRepository } from "./me.repository";
import { ReverseGeocodeService } from "./reverse-geocode.service";

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
  public constructor(
    @Inject(MeRepository) private readonly meRepository: MeRepository,
    @Inject(ReverseGeocodeService) private readonly reverseGeocode: ReverseGeocodeService
  ) {}

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

  public async updateLocation(currentUser: AuthenticatedUser, payload: UpdateLocationDto) {
    const placeLabel = await this.reverseGeocode.resolvePlaceLabel(
      payload.latitude,
      payload.longitude
    );
    return this.meRepository.addLocation(
      currentUser.id,
      payload.latitude,
      payload.longitude,
      placeLabel
    );
  }

  public async listLocationHistory(
    currentUser: AuthenticatedUser,
    limit: number
  ): Promise<LocationPingHistoryRow[]> {
    const take = Math.min(100, Math.max(1, limit));
    const rows: LocationPingHistoryRow[] = await this.meRepository.listLocationPingsByUser(
      currentUser.id,
      take
    );
    return rows;
  }
}
