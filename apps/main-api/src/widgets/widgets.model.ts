import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from "@nestjs/graphql";

// A widget as its author sees it, which is deliberately not the definition.
//
// The document is several kilobytes of JSON and the studio page is a list of
// names, so what comes back from a save and what fills the table are the four
// facts somebody needs: what it is called, the id to paste into a site, which
// version is being served, and when it last changed.
//
// "WidgetId" is the public name and the only one that leaves the database --
// 'w_' and sixteen random bytes. See apps/main-db/sql/Tables/Widgets.sql for
// why it is random rather than sequential: the endpoint that serves a
// definition to somebody else's page carries no token, so the id is what
// stands between "public to whoever was given it" and "public to whoever
// counts".
@ObjectType()
export class SavedWidget {
  @Field(() => ID)
  WidgetId!: string;
  @Field(() => String)
  Name!: string;
  // Which version a browser is being served. It rises by one on every save,
  // and it is the number that makes a stale cache visible: "the page is
  // showing 16 and you published 17".
  @Field(() => Int)
  Version!: number;
  @Field(() => GraphQLISODateTime)
  UpdatedAt!: Date;
}

// The same widget in a list, with when it was first saved as well. Two types
// rather than one nullable field: a save answers about the save, and the table
// wants the age of the thing.
@ObjectType()
export class WidgetSummary {
  @Field(() => ID)
  WidgetId!: string;
  @Field(() => String)
  Name!: string;
  @Field(() => Int)
  Version!: number;
  @Field(() => GraphQLISODateTime)
  CreatedAt!: Date;
  @Field(() => GraphQLISODateTime)
  UpdatedAt!: Date;
}
