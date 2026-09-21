import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import type { Request } from "express";
import { queryLimits } from "./query-limits.js";
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        path: "/graphql",
        autoSchemaFile: true,
        sortSchema: true,
        introspection: config.get("NODE_ENV") !== "production",
        playground: false,
        csrfPrevention: true,
        allowBatchedHttpRequests: false,
        includeStacktraceInErrorResponses: false,
        validationRules: [queryLimits],
        context: ({ req }: { req: Request }) => ({ req }),
        formatError: (error) => ({
          message:
            error.extensions?.code === "INTERNAL_SERVER_ERROR"
              ? "Internal server error"
              : error.message,
          locations: error.locations,
          path: error.path,
          extensions: {
            code: error.extensions?.code ?? "INTERNAL_SERVER_ERROR",
          },
        }),
      }),
    }),
  ],
})
export class ApiGraphqlModule {}
