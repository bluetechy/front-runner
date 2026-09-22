import {
  Field,
  InputType,
  ObjectType,
  ID,
  Int,
  GraphQLISODateTime,
  registerEnumType,
} from "@nestjs/graphql";

// The wallet: one list holding both kinds of saved payment method, and the two
// inputs that add to it.
//
// A card number never appears in either direction. It goes in once, as
// CreditCardInput."Number", and is encrypted by dbo.AddCreditCard on the way
// into the column; nothing reads it back, and PaymentMethod carries only the
// last four digits. See apps/main-db/sql/Tables/CreditCards.sql.

// Which table a method is in, and the only two answers there are. An enum
// rather than a string so a caller cannot invent a third and have the database
// be the thing that says no.
export enum PaymentMethodKind {
  CreditCard = "CreditCard",
  BankAccount = "BankAccount",
}
registerEnumType(PaymentMethodKind, { name: "PaymentMethodKind" });

// One saved method. The shape is the union of a card and a bank account, so
// the fields only one of them has are null on the other: a bank account has no
// expiry, a card has no routing number. "Kind" says which one you are holding
// and is the first thing to branch on. A null here is never "unanswered" --
// the columns behind it are all NOT NULL -- it is "this kind does not have
// that".
@ObjectType()
export class PaymentMethod {
  @Field(() => PaymentMethodKind)
  Kind!: PaymentMethodKind;
  @Field(() => ID)
  PaymentMethodUUID!: string;
  // The name on the card, or the name on the account.
  @Field(() => String)
  NameOnMethod!: string;
  // The only part of the number anything is shown.
  @Field(() => String)
  Last4!: string;
  // Card only, and derived from the number rather than chosen: see
  // dbo.AddCreditCard.
  @Field(() => String, { nullable: true })
  Brand!: string | null;
  @Field(() => Int, { nullable: true })
  ExpirationMonth!: number | null;
  @Field(() => Int, { nullable: true })
  ExpirationYear!: number | null;
  // Computed against today rather than stored, because it is a fact about
  // today. A bank account never expires and reports false.
  @Field(() => Boolean)
  IsExpired!: boolean;
  @Field(() => String, { nullable: true })
  AccountType!: string | null;
  // In the clear on purpose: a routing number names a bank, not an account.
  @Field(() => String, { nullable: true })
  RoutingNumber!: string | null;
  @Field(() => String, { nullable: true })
  BillingLine1!: string | null;
  @Field(() => String, { nullable: true })
  BillingCity!: string | null;
  @Field(() => String, { nullable: true })
  BillingState!: string | null;
  @Field(() => String, { nullable: true })
  BillingPostalCode!: string | null;
  @Field(() => String, { nullable: true })
  BillingCountry!: string | null;
  // One per wallet, across both kinds. dbo.SetDefaultPaymentMethod is what
  // keeps that true; see its header for why no constraint can.
  @Field(() => Boolean)
  IsDefault!: boolean;
  @Field(() => GraphQLISODateTime)
  CreatedAt!: Date;
}

@InputType()
export class CreditCardInput {
  @Field(() => String)
  NameOnCard!: string;
  // As typed, separators and all -- the schema strips them. This is the only
  // place a card number exists in this API.
  @Field(() => String)
  Number!: string;
  // Checked for shape and then **dropped**. A card cannot be authorised
  // without one, so the form has to collect it and it has to arrive here; what
  // it must never do is be stored, and dbo.CreditCards has no column for it.
  // When a payment processor is wired up this is what gets handed to it, at
  // which point it stops being dead weight. Nothing logs it.
  @Field(() => String)
  SecurityCode!: string;
  @Field(() => Int)
  ExpirationMonth!: number;
  // In full, as 2029. A card prints two digits; turning those into a year is
  // the browser's job, done once, rather than a guess made in three places.
  @Field(() => Int)
  ExpirationYear!: number;
  // The card's billing address, which is not the person's address on their
  // profile: a card is billed wherever its statement goes.
  @Field(() => String)
  BillingLine1!: string;
  @Field(() => String)
  BillingCity!: string;
  @Field(() => String)
  BillingState!: string;
  @Field(() => String)
  BillingPostalCode!: string;
  @Field(() => String)
  BillingCountry!: string;
}

@InputType()
export class BankAccountInput {
  @Field(() => String)
  NameOnAccount!: string;
  @Field(() => String)
  AccountType!: string;
  @Field(() => String)
  RoutingNumber!: string;
  @Field(() => String)
  Number!: string;
}
