import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user.type";
import type { CreateGeofenceDto } from "./dto/create-geofence.dto";
import type { UpdateGeofenceDto } from "./dto/update-geofence.dto";
import { GeofenceRepository } from "./geofence.repository";
import { haversineDistanceMeters } from "./haversine";

const GEOFENCE_MANAGER_ROLES = new Set<UserRole>(["admin", "supervisor"]);

@Injectable()
export class GeofenceService {
  public constructor(@Inject(GeofenceRepository) private readonly repository: GeofenceRepository) {}

  /** Matches PRD: `/admin/*` is supervisor + admin. */
  public requireSupervisorOrAdmin(currentUser: AuthenticatedUser): void {
    if (!GEOFENCE_MANAGER_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Only supervisor or admin users can manage geofences");
    }
  }

  /**
   * When at least one geofence is active, sign-in must include coordinates inside any active circle.
   * When none are active, location is not required.
   */
  public async assertLoginAllowed(latitude?: number, longitude?: number): Promise<void> {
    const active = await this.repository.findActive();
    if (active.length === 0) {
      return;
    }

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        "Current location is required to sign in because a work area is configured. Enable location for this site and try again."
      );
    }

    const inside = active.some(
      (fence) =>
        haversineDistanceMeters(latitude, longitude, fence.centerLatitude, fence.centerLongitude) <=
        fence.radiusMeters
    );

    if (!inside) {
      throw new ForbiddenException(
        "Sign-in is only allowed from within the authorized work area. Move inside the designated zone or contact your administrator."
      );
    }
  }

  /**
   * Returns nearest active geofence (if any) and great-circle distance from the point.
   */
  public async findNearestActiveGeofence(
    latitude: number,
    longitude: number
  ): Promise<{
    geofenceId: string;
    label: string;
    distanceMeters: number;
    radiusMeters: number;
  } | null> {
    const active = await this.repository.findActive();
    if (active.length === 0) {
      return null;
    }

    let nearest: {
      geofenceId: string;
      label: string;
      distanceMeters: number;
      radiusMeters: number;
    } | null = null;
    for (const fence of active) {
      const distanceMeters = haversineDistanceMeters(
        latitude,
        longitude,
        fence.centerLatitude,
        fence.centerLongitude
      );
      if (nearest === null || distanceMeters < nearest.distanceMeters) {
        nearest = {
          geofenceId: fence.id,
          label: fence.label,
          distanceMeters,
          radiusMeters: fence.radiusMeters
        };
      }
    }
    return nearest;
  }

  public listForAdmin(currentUser: AuthenticatedUser) {
    this.requireSupervisorOrAdmin(currentUser);
    return this.repository.findAll();
  }

  public async createForAdmin(currentUser: AuthenticatedUser, dto: CreateGeofenceDto) {
    this.requireSupervisorOrAdmin(currentUser);
    return this.repository.create({
      label: dto.label,
      centerLatitude: dto.centerLatitude,
      centerLongitude: dto.centerLongitude,
      radiusMeters: dto.radiusMeters,
      isActive: dto.isActive ?? true
    });
  }

  public async updateForAdmin(currentUser: AuthenticatedUser, id: string, dto: UpdateGeofenceDto) {
    this.requireSupervisorOrAdmin(currentUser);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("Geofence not found");
    }
    return this.repository.update(id, dto);
  }
}
