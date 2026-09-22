import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import {
  BankAccountInput,
  CreditCardInput,
  PaymentMethod,
  PaymentMethodKind,
} from "./wallet.model.js";
import {
  bankAccountSchema,
  creditCardSchema,
  type BankAccountFields,
  type CreditCardFields,
} from "./wallet.schema.js";
import { WalletService } from "./wallet.service.js";

// Your own wallet, and nothing else. None of these takes a user: the login
// name comes from the verified token, so there is no way to name somebody
// else's wallet, and no authorization question on the page beyond being
// signed in.
//
// The four mutations all return the whole wallet rather than the row they
// touched, because all four can move the default. See the service.
@Resolver(() => PaymentMethod)
export class WalletResolver {
  constructor(private readonly service: WalletService) {}

  @Query(() => [PaymentMethod])
  paymentMethods(@CurrentUser() user: Principal) {
    return this.service.list(user.loginName);
  }

  @Mutation(() => [PaymentMethod])
  addCreditCard(
    @CurrentUser() user: Principal,
    @Args(
      "card",
      { type: () => CreditCardInput },
      new ZodPipe(creditCardSchema),
    )
    card: CreditCardFields,
  ) {
    return this.service.addCreditCard(user.loginName, card);
  }

  @Mutation(() => [PaymentMethod])
  addBankAccount(
    @CurrentUser() user: Principal,
    @Args(
      "account",
      { type: () => BankAccountInput },
      new ZodPipe(bankAccountSchema),
    )
    account: BankAccountFields,
  ) {
    return this.service.addBankAccount(user.loginName, account);
  }

  @Mutation(() => [PaymentMethod])
  setDefaultPaymentMethod(
    @CurrentUser() user: Principal,
    @Args("kind", { type: () => PaymentMethodKind }) kind: PaymentMethodKind,
    @Args("paymentMethodId", { type: () => String }, new ParseUUIDPipe())
    paymentMethodId: string,
  ) {
    return this.service.setDefault(user.loginName, kind, paymentMethodId);
  }

  @Mutation(() => [PaymentMethod])
  removePaymentMethod(
    @CurrentUser() user: Principal,
    @Args("kind", { type: () => PaymentMethodKind }) kind: PaymentMethodKind,
    @Args("paymentMethodId", { type: () => String }, new ParseUUIDPipe())
    paymentMethodId: string,
  ) {
    return this.service.remove(user.loginName, kind, paymentMethodId);
  }
}
