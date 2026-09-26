package com.frontrunner.keycloak.sms;

import java.security.SecureRandom;
import java.util.Objects;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.UserModel;

/**
 * The six digits: making one, remembering it, and spending it.
 *
 * <p>Both authenticators keep their code here rather than each holding its
 * own, because they are the same code with the same rules and the rules are
 * the only thing protecting six digits. Five minutes, one code outstanding per
 * account, and spent the moment it is read -- so a code cannot be tried twice
 * and a second login attempt cannot reuse the first one's message.
 *
 * <p>It is kept in Keycloak's single-use object store rather than in the
 * authentication session, and the reason is the direct grant: that flow is one
 * request, so the second request carrying the code is a different
 * authentication session entirely and an auth note would be gone by the time
 * it mattered. The store is shared across Keycloak instances, which the
 * authentication session is not.
 */
final class SmsCode {
    /** Long enough to walk to where the phone is, short enough to be over. */
    static final int LIFETIME_SECONDS = 300;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String KEY_PREFIX = "front-runner.sms-code.";

    private SmsCode() {}

    /** Six digits, leading zeros kept, from a source worth trusting. */
    static String generate() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    /**
     * Remember it against the account, replacing whatever was outstanding.
     *
     * <p>Replacing rather than adding is what makes "send it again" safe: the
     * first message stops working the moment the second is sent, so a message
     * somebody never received is not left live in a phone that is switched
     * off.
     */
    static void remember(KeycloakSession session, UserModel user, String code) {
        String key = keyFor(user);
        session.singleUseObjects().remove(key);
        session.singleUseObjects().put(key, LIFETIME_SECONDS, java.util.Map.of("code", code));
    }

    /**
     * Take the outstanding code, if there is one. It is gone afterwards
     * whether or not it matched.
     *
     * <p>Spent on being read rather than on being right, which is what keeps
     * six digits out of reach of a script: one guess per message, and a wrong
     * guess costs another round trip through a handset.
     */
    static boolean spend(KeycloakSession session, UserModel user, String presented) {
        var held = session.singleUseObjects().remove(keyFor(user));
        if (held == null || presented == null) {
            return false;
        }
        String expected = held.get("code");
        // Constant time, because the comparison is against six digits and a
        // timing difference is worth more against six digits than against
        // anything else in this product.
        return expected != null && constantTimeEquals(expected, presented.trim());
    }

    /** Whether a code is waiting on this account, without spending it. */
    static boolean outstanding(KeycloakSession session, UserModel user) {
        return session.singleUseObjects().get(keyFor(user)) != null;
    }

    private static String keyFor(UserModel user) {
        return KEY_PREFIX + Objects.requireNonNull(user).getId();
    }

    private static boolean constantTimeEquals(String expected, String presented) {
        if (expected.length() != presented.length()) {
            return false;
        }
        int difference = 0;
        for (int index = 0; index < expected.length(); index++) {
            difference |= expected.charAt(index) ^ presented.charAt(index);
        }
        return difference == 0;
    }
}
