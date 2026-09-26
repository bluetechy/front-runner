package com.frontrunner.keycloak.sms;

import org.keycloak.models.UserModel;

/**
 * The number an account is texted at, and where it is kept.
 *
 * <p>An attribute on the account rather than a credential, because there is no
 * secret to store: what an SMS factor proves is possession of a handset, and
 * all Keycloak needs written down is where to send the code. main-api writes
 * it through the admin API, and only ever after a code sent to it has been
 * typed back -- see apps/main-api/src/two-factor. Nothing in this package
 * writes it, which is the point: an authenticator that could attach a number
 * would be an authenticator that could attach somebody else's.
 */
final class SmsPhone {
    /** The same names main-api writes. Changing one means changing both. */
    static final String NUMBER_ATTRIBUTE = "phoneNumber";

    private SmsPhone() {}

    /** The number, or null where this account has none. */
    static String of(UserModel user) {
        if (user == null) {
            return null;
        }
        String number = user.getFirstAttribute(NUMBER_ATTRIBUTE);
        return number == null || number.isBlank() ? null : number.trim();
    }

    /** Whether this account has SMS as a second factor at all. */
    static boolean configured(UserModel user) {
        return of(user) != null;
    }

    /**
     * The number as it is shown to somebody waiting for the message: the last
     * four digits and nothing else.
     *
     * <p>The login page is seen before anybody has proved who they are, so it
     * is the one page in the product with the strongest reason not to print a
     * phone number: the person reading it may be the attacker, and the last
     * four digits are enough for the account's owner to recognize and not
     * enough for anybody else to use.
     */
    static String masked(String number) {
        String digits = number == null ? "" : number.replaceAll("\\D", "");
        return digits.length() <= 4 ? digits : "•••• " + digits.substring(digits.length() - 4);
    }
}
