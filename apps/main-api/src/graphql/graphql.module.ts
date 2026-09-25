import { HttpException, HttpStatus, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { unwrapResolverError } from "@apollo/server/errors";
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
        // What a failure is allowed to say.
        //
        // Anything unrecognized came out of the database or out of a bug, and
        // its message is ours rather than the caller's: a stack trace or a
        // SQL error is not a sentence to put in a browser.
        //
        // The exception is an outage we raised on purpose. Every
        // ServiceUnavailableException in this API carries a sentence somebody
        // wrote for a person to read -- "the identity provider would not say
        // which logins this account has connected" -- and Nest hands it here
        // as an unrecognized failure, so without this line the security page
        // answers a provider that is down with "Internal server error". That
        // is true and useless: it says the fault is ours when the fault is
        // that something we depend on is not answering.
        //
        // The second argument is what was actually thrown, unwrapped from the
        // GraphQLError Apollo puts around a resolver's failure.
        formatError: (error, thrown) => {
          const raised = unwrapResolverError(thrown);
          const outage =
            raised instanceof HttpException &&
            raised.getStatus() === HttpStatus.SERVICE_UNAVAILABLE;
          return {
            message: outage
              ? raised.message
              : error.extensions?.code === "INTERNAL_SERVER_ERROR"
                ? "Internal server error"
                : error.message,
            locations: error.locations,
            path: error.path,
            extensions: {
              code: outage
                ? "SERVICE_UNAVAILABLE"
                : (error.extensions?.code ?? "INTERNAL_SERVER_ERROR"),
            },
          };
        },
      }),
    }),
  ],
})
export class ApiGraphqlModule {}
