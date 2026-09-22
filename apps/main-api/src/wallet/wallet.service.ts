import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/index.js";
import { PaymentMethod, PaymentMethodKind } from "./wallet.model.js";
import type { BankAccountFields, CreditCardFields } from "./wallet.schema.js";

@Injectable()
export class WalletService {
  // The key dbo.AddCreditCard and dbo.AddBankAccount encrypt with. It lives
  // here and in the environment and nowhere else -- in particular not in the
  // database it protects, which is the only reason encrypting the column buys
  // anything at all. See apps/main-db/sql/Tables/CreditCards.sql: the column,
  // this key, and the whole arrangement are meant to be deleted when a payment
  // processor is wired up and the number stops crossing this boundary.
  private readonly encryptionKey: string;

  constructor(
    private readonly db: DatabaseService,
    config: ConfigService,
  ) {
    this.encryptionKey = config.getOrThrow<string>("WALLET_ENCRYPTION_KEY");
  }

  // Cards and bank accounts in one list, newest first by when each was saved.
  // The default is not sorted to the top: choosing one says which method pays,
  // not where it sits. An account with nothing saved gets an empty wallet
  // rather than an error.
  list(loginName: string) {
    return this.db.query<PaymentMethod>(
      'SELECT * FROM dbo."GetPaymentMethods"($1)',
      [loginName],
    );
  }

  // Every write answers with the whole wallet, because every write can move
  // the default: the first method added takes it, and removing the one that
  // has it passes it on. A caller handed a single row would have to guess
  // which of the others had changed underneath it.
  //
  // "SecurityCode" is not among the parameters and there is no column for it.
  // It is validated on the way in and goes no further; see wallet.model.ts.
  addCreditCard(loginName: string, card: CreditCardFields) {
    return this.db.query<PaymentMethod>(
      'SELECT * FROM dbo."AddCreditCard"($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [
        loginName,
        card.NameOnCard,
        card.Number,
        card.ExpirationMonth,
        card.ExpirationYear,
        card.BillingLine1,
        card.BillingCity,
        card.BillingState,
        card.BillingPostalCode,
        card.BillingCountry,
        this.encryptionKey,
      ],
    );
  }

  addBankAccount(loginName: string, account: BankAccountFields) {
    return this.db.query<PaymentMethod>(
      'SELECT * FROM dbo."AddBankAccount"($1, $2, $3, $4, $5, $6)',
      [
        loginName,
        account.NameOnAccount,
        account.AccountType,
        account.RoutingNumber,
        account.Number,
        this.encryptionKey,
      ],
    );
  }

  // The login name is the token's, never the caller's, so neither of these can
  // reach into somebody else's wallet by naming a method in it. The database
  // checks ownership again regardless, and answers a method that is not yours
  // the same way it answers one that does not exist.
  setDefault(loginName: string, kind: PaymentMethodKind, methodId: string) {
    return this.db.query<PaymentMethod>(
      'SELECT * FROM dbo."SetDefaultPaymentMethod"($1, $2, $3)',
      [loginName, kind, methodId],
    );
  }

  remove(loginName: string, kind: PaymentMethodKind, methodId: string) {
    return this.db.query<PaymentMethod>(
      'SELECT * FROM dbo."RemovePaymentMethod"($1, $2, $3)',
      [loginName, kind, methodId],
    );
  }
}
