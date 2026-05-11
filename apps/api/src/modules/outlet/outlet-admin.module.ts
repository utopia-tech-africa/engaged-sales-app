import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { OutletController } from "./outlet.controller";
import { OutletCoreModule } from "./outlet-core.module";

@Module({
  imports: [OutletCoreModule, AuthModule],
  controllers: [OutletController]
})
export class OutletAdminModule {}
