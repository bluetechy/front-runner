package com.frontrunner.keycloak.sms;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.Authenticator;
import org.keycloak.events.Errors;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

/**
 * The SMS step of the password grant, which is how this product's own login
 * card logs people in.
 *
 * <p>It is a separate class from {@link SmsAuthenticator} and it has to be:
 * the browser flow is a conversation across two requests with a form in the
 * middle, and a password grant is one request with no second chance. So the
 * shape is different. The first request arrives with no code in it, this sends
 * one and <b>refuses the grant</b>; the login card keeps what was typed, asks
 * for the digits, and posts the whole thing again with {@code sms_code} on it.
 *
 * <p>Which makes the refusal itself load-bearing. It is
 * {@code invalid_grant / "Invalid user credentials"} -- the same words a wrong
 * password gets -- because anything more specific would answer "does this
 * account exist, and does it have SMS on it" to anybody who posted a name at
 * the token endpoint. The login card cannot tell the two apart either, which
 * is why it asks for the password and the code together after a refusal
 * rather than trying to guess which one is wanted. See
 * apps/main-gui/docs/authentication.md.
 *
 * <p>Forgetting this class is the classic way to ship a second factor with a
 * hole in it: a browser flow alone leaves the token endpoint answering
 * password-only, and everything the login page enforces can be skipped by
 * asking for a token directly.
 *
 * <p><b>Every send is claimed from {@link SmsSendBudget} first</b>, and over
 * budget the grant is refused with nothing sent. The refusal is the same
 * {@code invalid_grant} as every other one here, deliberately: a distinct
 * answer for "this account has been texted five times already" would tell
 * anybody posting a name at the token endpoint that the account exists and
 * has SMS on it, which is the one thing this class is careful never to say.
 * Somebody legitimately caught by it waits, and the browser login page, where
 * the account is already known, says so in words.
 */
public class SmsDirectGrantAuthenticator implements Authenticator {
    static final String CODE_PARAMETER = "sms_code";

    private final SmsGateway gateway;

    SmsDirectGrantAuthenticator(SmsGateway gateway) {
        this.gateway = gateway;
    }

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        UserModel user = context.getUser();
        String number = SmsPhone.of(user);

        if (number == null) {
            // As in the browser flow: reached for an account with no number,
            // which the conditional should have prevented. Refused, because a
            // factor that quietly does nothing is worse than no factor.
            refuse(context, "invalid_grant");
            return;
        }

        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();
        String presented = form.getFirst(CODE_PARAMETER);

        if (presented == null || presented.isBlank()) {
            // A code already waiting is a code the client can still be asked
            // for. Re-posting the password without one does not buy a second
            // message for the same attempt.
            if (SmsCode.outstanding(context.getSession(), user)) {
                refuse(context, "invalid_grant");
                return;
            }
            if (!claim(context, user)) {
                // Over budget. Refused with nothing sent, and in the same
                // words as everything else here.
                refuse(context, "invalid_grant");
                return;
            }
            // Nothing was sent, so send one and refuse. The client has to come
            // back with the whole grant again, code included.
            if (gateway.send(number, remember(context, user))) {
                refuse(context, "invalid_grant");
            } else {
                // Nowhere to send it. A different error, because this one is
                // not about the person's credentials at all and a client that
                // asked them to type a code they will never receive would be
                // worse than one that says the site is having trouble.
                refuseUnavailable(context);
            }
            return;
        }

        if (SmsCode.spend(context.getSession(), user, presented)) {
            context.success();
            return;
        }

        // One guess per message, the same rule the browser flow keeps. A new
        // code goes out with the refusal so the next attempt has something to
        // answer with -- unless the budget is spent, which is the case this
        // guard is for: a loop of wrong codes is a loop of paid-for messages,
        // and it looks exactly like somebody who has lost their phone.
        if (claim(context, user)) {
            gateway.send(number, remember(context, user));
        }
        refuse(context, "invalid_grant");
    }

    /** Whether a message may go out for this account right now. */
    private boolean claim(AuthenticationFlowContext context, UserModel user) {
        return SmsSendBudget.claim(context.getSession(), user) == SmsSendBudget.Decision.ALLOWED;
    }

    private String remember(AuthenticationFlowContext context, UserModel user) {
        String code = SmsCode.generate();
        SmsCode.remember(context.getSession(), user, code);
        return code;
    }

    /**
     * The one refusal, and the one sentence. Keycloak writes exactly this for
     * a wrong password, so a caller cannot tell a missing code, a wrong code
     * and a wrong password apart -- which is the point.
     */
    private void refuse(AuthenticationFlowContext context, String error) {
        context.getEvent().user(context.getUser());
        context.getEvent().error(Errors.INVALID_USER_CREDENTIALS);
        Response challenge = errorResponse(
                Response.Status.UNAUTHORIZED.getStatusCode(),
                error,
                "Invalid user credentials");
        context.failure(AuthenticationFlowError.INVALID_CREDENTIALS, challenge);
    }

    private void refuseUnavailable(AuthenticationFlowContext context) {
        Response challenge = errorResponse(
                Response.Status.SERVICE_UNAVAILABLE.getStatusCode(),
                "temporarily_unavailable",
                "A login code could not be sent");
        context.failure(AuthenticationFlowError.INTERNAL_ERROR, challenge);
    }

    private Response errorResponse(int status, String error, String description) {
        return Response.status(status)
                .entity("{\"error\":\"" + error + "\",\"error_description\":\"" + description + "\"}")
                .type(jakarta.ws.rs.core.MediaType.APPLICATION_JSON_TYPE)
                .build();
    }

    /**
     * Never reached. A direct grant is one request: there is no form to come
     * back, so nothing ever calls this. Present because the interface is
     * shared with the browser flow, where it is the whole second half.
     */
    @Override
    public void action(AuthenticationFlowContext context) {
        // Nothing.
    }

    @Override
    public boolean requiresUser() {
        return true;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return SmsPhone.configured(user);
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
        // Nothing to set up from here: see SmsAuthenticator.
    }

    @Override
    public void close() {
        // Nothing held.
    }

    /**
     * Never true here, whatever the flow says. A direct grant has no browser
     * to send anywhere, so an account that is not set up for this step cannot
     * be asked to set it up mid-grant.
     */
    static boolean userSetupAllowed() {
        return false;
    }

}
