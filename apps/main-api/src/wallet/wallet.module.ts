import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/index.js";
import { WalletResolver } from "./wallet.resolver.js";
import { WalletService } from "./wallet.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [WalletResolver, WalletService],
})
export class WalletModule {}
