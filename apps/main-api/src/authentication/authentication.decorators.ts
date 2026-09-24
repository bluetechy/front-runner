import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
export interface Principal {
  userId: string;
  loginName: string;
  // The identity provider's session, where the token carries one. Null for a
  // machine's token: a service account and a client-credentials grant have no
  // session, which is also why neither puts a login on anybody's page.
  //
  // Here for exactly one operation, recordLogout, which has to be able to say
  // *which* session ended rather than that this account logged out of something.
  // Nothing else reads it, and nothing should reach for it as an identifier --
  // it is the provider's vocabulary, and it changes on every login.
  sessionId: string | null;
  // What the request said it came from: "Mac OS", "iPhone", or null where the
  // User-Agent said nothing recognizable. Computed once beside the session id
  // because it is read off the same request, and read by recordLogout so that a
  // logout can name a device the way the login above it does.
  device: string | null;
}
export interface AuthenticatedRequest extends Request {
  principal: Principal;
  authentication?: Promise<Principal>;
}
export interface GraphqlContext {
  req: AuthenticatedRequest;
}
export const PUBLIC_OPERATION = "publicOperation";
export const Public = () => SetMetadata(PUBLIC_OPERATION, true);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    GqlExecutionContext.create(context).getContext<GraphqlContext>().req
      .principal,
);
