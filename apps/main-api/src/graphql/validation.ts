import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ArgsType, Field, Int } from "@nestjs/graphql";
import type { ZodType } from "zod";
@ArgsType()
export class PageArgs {
  @Field(() => Int, { defaultValue: 50 }) limit = 50;
  @Field(() => Int, { defaultValue: 0 }) offset = 0;
}
@Injectable()
export class PagePipe implements PipeTransform<PageArgs, PageArgs> {
  transform(page: PageArgs): PageArgs {
    if (
      !Number.isInteger(page.limit) ||
      page.limit < 1 ||
      page.limit > 100 ||
      !Number.isInteger(page.offset) ||
      page.offset < 0 ||
      page.offset > 100000
    ) {
      throw new BadRequestException("limit must be 1–100 and offset 0–100000");
    }
    return page;
  }
}
// Shape only. Whether the address is reachable is not something a regular
// expression can answer, and the database folds it to lower case -- this
// rejects what dbo.Users."Email" could not store and what dbo.InviteToOrganization
// would refuse anyway.
@Injectable()
export class EmailPipe implements PipeTransform<string, string> {
  transform(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (
      !trimmed ||
      trimmed.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ) {
      throw new BadRequestException("A valid email address is required");
    }
    return trimmed;
  }
}
@Injectable()
export class NamePipe implements PipeTransform<string, string> {
  transform(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64)
      throw new BadRequestException("Name must contain 1–64 characters");
    return trimmed;
  }
}

// An argument checked against a zod schema, for inputs with more fields than
// a pipe of their own would be worth writing. The pipe hands back what the
// schema parsed rather than what arrived, so trimming and defaults in the
// schema are what reach the service.
//
// Every failing field is reported, not just the first: a form that has to be
// submitted once per mistake is a form nobody finishes.
export class ZodPipe<Shape> implements PipeTransform<unknown, Shape> {
  constructor(private readonly schema: ZodType<Shape>) {}
  transform(value: unknown): Shape {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException(
      result.error.issues
        .map((issue) =>
          issue.path.length
            ? `${issue.path.join(".")}: ${issue.message}`
            : issue.message,
        )
        .join("; "),
    );
  }
}
