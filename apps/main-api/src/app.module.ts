import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./configuration/index.js";
import { AuthenticationModule } from "./authentication/index.js";
import { ApiGraphqlModule } from "./graphql/index.js";
import { HealthModule } from "./health/index.js";
import { UsersModule } from "./users/index.js";
import { ProfilesModule } from "./profiles/index.js";
import { EmailsModule } from "./emails/index.js";
import { RegistrationModule } from "./registration/index.js";
import { PasswordResetModule } from "./password-reset/index.js";
import { OrganizationsModule } from "./organizations/index.js";
import { TeamsModule } from "./teams/index.js";
import { BadgesModule } from "./badges/index.js";
import { PointsModule } from "./points/index.js";
import { TalliesModule } from "./tallies/index.js";
import { WalletModule } from "./wallet/index.js";
import { NotificationsModule } from "./notifications/index.js";

@Module({
  imports: [
    ConfigurationModule,
    AuthenticationModule,
    ApiGraphqlModule,
    HealthModule,
    UsersModule,
    ProfilesModule,
    EmailsModule,
    RegistrationModule,
    PasswordResetModule,
    OrganizationsModule,
    TeamsModule,
    BadgesModule,
    PointsModule,
    TalliesModule,
    WalletModule,
    NotificationsModule,
  ],
})
export class AppModule {}
