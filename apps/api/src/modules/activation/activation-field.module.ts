import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ActivationCoreModule } from "./activation-core.module";
import { FieldActivationsController } from "./field-activations.controller";

@Module({
  imports: [ActivationCoreModule, AuthModule],
  controllers: [FieldActivationsController]
})
export class ActivationFieldModule {}
