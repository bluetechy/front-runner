import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
export interface Principal { userId: string; loginName: string; }
export interface AuthenticatedRequest extends Request { principal: Principal; authentication?: Promise<Principal>; }
export interface GraphqlContext { req: AuthenticatedRequest; }
export const PUBLIC_OPERATION = 'publicOperation';
export const Public = () => SetMetadata(PUBLIC_OPERATION, true);
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): Principal =>
  GqlExecutionContext.create(context).getContext<GraphqlContext>().req.principal,
);
