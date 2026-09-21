import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ArgsType, Field, Int } from '@nestjs/graphql';
@ArgsType()
export class PageArgs {
  @Field(() => Int, { defaultValue: 50 }) limit = 50;
  @Field(() => Int, { defaultValue: 0 }) offset = 0;
}
@Injectable()
export class PagePipe implements PipeTransform<PageArgs, PageArgs> {
  transform(page: PageArgs): PageArgs {
    if (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100 ||
        !Number.isInteger(page.offset) || page.offset < 0 || page.offset > 100000) {
      throw new BadRequestException('limit must be 1–100 and offset 0–100000');
    }
    return page;
  }
}
@Injectable()
export class NamePipe implements PipeTransform<string, string> {
  transform(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) throw new BadRequestException('Name must contain 1–64 characters');
    return trimmed;
  }
}
