import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import {
  GeneratedRecoveryCodes,
  PhoneEnrollment,
  RecoveryCodeStatus,
  RecoveryCodeUse,
  TwoFactorMethod,
} from "./two-factor.model.js";

/*
 * The shapes the two cards are drawn from, and what is deliberately not on
 * them.
 *
 * One rule runs through all five: no secret leaves this API except the ten
 * codes, once, in the answer to the mutation that made them. A factor's row
 * carries no secret at all -- not the authenticator app's seed, not the QR
 * code, not the credential id Keycloak addresses it by -- because a page that
 * shows you which factors you have has no use for any of them, and the id in
 * particular is the handle that removes one.
 */

const fieldsOf = (shape: object) => Object.getOwnPropertyNames(shape);

describe("what a row of the two-factor card is drawn from", () => {
  it("is the kind, its name, and the five things a row says", () => {
    expect(fieldsOf(new TwoFactorMethod())).toEqual([
      "Kind",
      "Name",
      "Available",
      "Configured",
      "ConfiguredAt",
      "Label",
      "Recommended",
    ]);
  });

  it("carries no secret, no seed and no credential id from the provider", () => {
    expect(
      fieldsOf(new TwoFactorMethod()).filter((field) =>
        /secret|seed|token|qr|credentialid|password/i.test(field),
      ),
    ).toEqual([]);
  });
});

describe("what the dialog waiting for a text message is drawn from", () => {
  it("is the number it went to and when it went, and nothing else", () => {
    expect(fieldsOf(new PhoneEnrollment())).toEqual(["PhoneNumber", "SentAt"]);
  });

  /* Not the code. It exists in the message and as a hash in the database, and
   * an answer carrying it would be a second factor anybody watching the
   * network could finish setting up. */
  it("carries nothing a reader could type back into the box", () => {
    expect(
      fieldsOf(new PhoneEnrollment()).filter((field) =>
        /code|secret|token|hash/i.test(field),
      ),
    ).toEqual([]);
  });
});

describe("what the recovery codes card is drawn from", () => {
  it("is a count, a total and a date, and no code", () => {
    expect(fieldsOf(new RecoveryCodeStatus())).toEqual([
      "Remaining",
      "Total",
      "GeneratedAt",
    ]);
  });

  /* The one answer in this API that carries a secret out of it, and the only
   * way these codes can work: what is stored is a hash, so nothing can show
   * them a second time. */
  it("hands the codes themselves over exactly once, beside that count", () => {
    expect(fieldsOf(new GeneratedRecoveryCodes())).toEqual(["Codes", "Status"]);
  });
});

describe("what spending a code answers", () => {
  /* It says what changed, and no session: a recovery code does not log
   * anybody in. Somebody who is not told the factor is gone will believe they
   * are still protected by it. */
  it("says whether the factor came off, and how many codes are left", () => {
    expect(fieldsOf(new RecoveryCodeUse())).toEqual([
      "TwoFactorRemoved",
      "Remaining",
    ]);
  });

  it("carries no token and no session", () => {
    expect(
      fieldsOf(new RecoveryCodeUse()).filter((field) =>
        /token|session|access/i.test(field),
      ),
    ).toEqual([]);
  });
});
