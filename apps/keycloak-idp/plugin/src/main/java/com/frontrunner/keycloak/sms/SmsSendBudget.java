package com.frontrunner.keycloak.sms;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.UserModel;

/**
 * How many login codes an account may be sent, and how close together.
 *
 * <p>Every message costs money and arrives on somebody's handset, and nothing
 * on the login path asks permission before sending one: the first sight of the
 * SMS step sends a code, the form's "send it again" sends a code, and
 * <b>a wrong code sends a code</b>. That last one is the reason this class
 * exists. The rule that makes six digits safe -- one guess per message -- also
 * turns a guessing loop into a way to spend money, so the budget has to be
 * counted across guesses rather than across logins.
 *
 * <p>Two limits, matching the ones {@code dbo.StartPhoneVerification} keeps
 * over enrollment, and set a little tighter because a login is a shorter
 * conversation than filling in a form:
 *
 * <ul>
 *   <li>Thirty seconds between messages to an account.
 *   <li>Five messages to an account in fifteen minutes.
 * </ul>
 *
 * <p><b>Being over budget refuses the login. It never waves it through.</b> A
 * second factor that gives up when it is inconvenient is not a second factor,
 * so the worst this can do to somebody is make them wait, which is the right
 * direction for the failure to point.
 *
 * <p>Kept in the single-use object store, keyed on the account, for the reason
 * {@link SmsCode} is: it has to outlive one authentication session, or a fresh
 * session would be a fresh budget and there would be no limit at all.
 *
 * <p><b>It is not atomic, and the store gives no way to make it one.</b> Two
 * requests arriving together can both read the same count and both send. That
 * is accepted deliberately: this is a cost guard rather than a security
 * boundary, the window is what matters and one extra message inside it changes
 * nothing worth defending. The comparable limit in Postgres is one statement
 * and does not have this problem; this store has no compare-and-set to build
 * it from.
 */
final class SmsSendBudget {
    /** What a caller may do next. */
    enum Decision {
        /** Send it, and it has been counted. */
        ALLOWED,
        /** A message went out moments ago. The one they have should still work. */
        TOO_SOON,
        /** The window is spent. Nothing more goes out until it rolls. */
        TOO_MANY
    }

    static final int COOLDOWN_SECONDS = 30;
    static final int WINDOW_SECONDS = 900;
    static final int MAX_IN_WINDOW = 5;

    private static final String KEY_PREFIX = "front-runner.sms-sends.";
    private static final String COUNT = "count";
    private static final String WINDOW_ENDS_AT = "windowEndsAt";
    private static final String LAST_SENT_AT = "lastSentAt";

    private SmsSendBudget() {}

    /**
     * Ask for one message, and take it out of the budget if it is there.
     *
     * <p>Called immediately before the send rather than after it, so that a
     * gateway which fails still spends the allowance. That is the safe
     * direction: the other one is a failing gateway that can be retried
     * without limit.
     */
    static Decision claim(KeycloakSession session, UserModel user) {
        String key = keyFor(user);
        var store = session.singleUseObjects();
        long now = Instant.now().getEpochSecond();

        Map<String, String> held = store.get(key);
        if (held == null) {
            store.put(key, WINDOW_SECONDS, note(1, now + WINDOW_SECONDS, now));
            return Decision.ALLOWED;
        }

        int count = number(held.get(COUNT), MAX_IN_WINDOW);
        long windowEndsAt = number(held.get(WINDOW_ENDS_AT), now);
        long lastSentAt = number(held.get(LAST_SENT_AT), now);

        if (count >= MAX_IN_WINDOW) {
            return Decision.TOO_MANY;
        }
        if (now - lastSentAt < COOLDOWN_SECONDS) {
            return Decision.TOO_SOON;
        }

        // The window keeps the end it was given, so five messages are five
        // messages from the first one rather than from the last: a limit that
        // pushed its own deadline back on every send would never be reached.
        store.remove(key);
        store.put(key, Math.max(1, windowEndsAt - now), note(count + 1, windowEndsAt, now));
        return Decision.ALLOWED;
    }

    private static Map<String, String> note(int count, long windowEndsAt, long lastSentAt) {
        return Map.of(
                COUNT, Integer.toString(count),
                WINDOW_ENDS_AT, Long.toString(windowEndsAt),
                LAST_SENT_AT, Long.toString(lastSentAt));
    }

    /**
     * A number that is not a number is read as the value that refuses, never
     * as a fresh budget: a corrupt record must not be a way to reset one.
     */
    private static long number(String written, long whenUnreadable) {
        try {
            return Long.parseLong(Objects.requireNonNullElse(written, ""));
        } catch (NumberFormatException ignored) {
            return whenUnreadable;
        }
    }

    private static int number(String written, int whenUnreadable) {
        return (int) number(written, (long) whenUnreadable);
    }

    private static String keyFor(UserModel user) {
        return KEY_PREFIX + Objects.requireNonNull(user).getId();
    }
}
