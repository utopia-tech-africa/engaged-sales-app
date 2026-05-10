import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ActivationController } from "./activation.controller";
import { ActivationCoreModule } from "./activation-core.module";

@Module({
  imports: [ActivationCoreModule, AuthModule],
  controllers: [ActivationController]
})
export class ActivationAdminModule {}
