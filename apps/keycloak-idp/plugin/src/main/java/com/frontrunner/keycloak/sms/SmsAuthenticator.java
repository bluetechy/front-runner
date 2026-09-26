package com.frontrunner.keycloak.sms;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.Authenticator;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

/**
 * The SMS step of the browser login.
 *
 * <p>Two passes, which is what an {@link Authenticator} is: {@link
 * #authenticate} is the first sight of the step and sends the message, {@link
 * #action} is the form coming back with the digits in it.
 *
 * <p>What is worth reading here is what each refusal costs.
 *
 * <p><b>A code that could not be sent fails the login.</b> Not a form saying
 * "try again": there is nothing to try, because no message is coming. The
 * alternative -- letting somebody past a factor the site could not apply --
 * would make an outage at Twilio into a way around two-factor authentication.
 *
 * <p><b>A wrong code costs a new message.</b> The code is spent on being read
 * rather than on being right, so there is exactly one guess per message. Six
 * digits are a fifth of a million, which is nothing against a form that allows
 * retries and a great deal against one that does not.
 */
public class SmsAuthenticator implements Authenticator {
    private static final Logger LOG = Logger.getLogger(SmsAuthenticator.class);

    static final String FORM = "sms-code.ftl";
    static final String CODE_FIELD = "sms_code";

    private final SmsGateway gateway;

    SmsAuthenticator(SmsGateway gateway) {
        this.gateway = gateway;
    }

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        UserModel user = context.getUser();
        String number = SmsPhone.of(user);

        // Reached with no number on the account, which the conditional in the
        // flow should have prevented. Refused rather than waved through: a
        // second factor that quietly does nothing is worse than one that is
        // not there, because the page says the account has it.
        if (number == null) {
            LOG.warn("The SMS step was reached for an account with no number on it");
            context.failure(AuthenticationFlowError.INVALID_CREDENTIALS);
            return;
        }

        if (!send(context, user, number)) {
            return;
        }

        context.challenge(form(context, number, null));
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        UserModel user = context.getUser();
        String number = SmsPhone.of(user);
        MultivaluedMap<String, String> form = context.getHttpRequest().getDecodedFormParameters();

        // "Send it again", from the link under the box. A fresh code retires
        // the one before it, so the message that went astray stops working.
        if (form.getFirst("resend") != null) {
            if (number == null || !send(context, user, number)) {
                return;
            }
            context.challenge(form(context, number, null));
            return;
        }

        if (SmsCode.spend(context.getSession(), user, form.getFirst(CODE_FIELD))) {
            context.success();
            return;
        }

        // One guess per message, so a wrong code means another message. The
        // form comes back saying so rather than leaving somebody typing into a
        // box whose code is already spent.
        if (number == null || !send(context, user, number)) {
            return;
        }
        context.failureChallenge(
                AuthenticationFlowError.INVALID_CREDENTIALS,
                form(context, number, "smsCodeWrong"));
    }

    private boolean send(AuthenticationFlowContext context, UserModel user, String number) {
        String code = SmsCode.generate();
        if (!gateway.send(number, code)) {
            // Failed rather than challenged. See the class comment: there is
            // no message coming, so there is nothing to wait for.
            context.failure(
                    AuthenticationFlowError.INTERNAL_ERROR,
                    context.form()
                            .setError("smsCodeNotSent")
                            .createErrorPage(Response.Status.SERVICE_UNAVAILABLE));
            return false;
        }
        SmsCode.remember(context.getSession(), user, code);
        return true;
    }

    private Response form(AuthenticationFlowContext context, String number, String error) {
        var form = context.form()
                .setAttribute("phoneNumber", SmsPhone.masked(number))
                .setAttribute("codeLifetimeMinutes", SmsCode.LIFETIME_SECONDS / 60);
        if (error != null) {
            form = form.setError(error);
        }
        return form.createForm(FORM);
    }

    /** There is nobody to text until the password step has said who. */
    @Override
    public boolean requiresUser() {
        return true;
    }

    /**
     * What the conditional in the flow reads. An account with a number gets
     * the step; an account without one never sees it, and is not offered it
     * either -- attaching a number happens on the security page, where the
     * person is already logged in, rather than in the middle of a login.
     */
    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return SmsPhone.configured(user);
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
        // Nothing. See configuredFor: there is no required action that could
        // set this up, because setting it up needs a message sent and answered
        // and that belongs on the security page.
    }

    @Override
    public void close() {
        // Nothing held.
    }

    /** Never the only thing between somebody and their account. */
    static AuthenticationExecutionModel.Requirement[] requirementChoices() {
        return new AuthenticationExecutionModel.Requirement[] {
            AuthenticationExecutionModel.Requirement.REQUIRED,
            AuthenticationExecutionModel.Requirement.ALTERNATIVE,
            AuthenticationExecutionModel.Requirement.DISABLED,
        };
    }
}
