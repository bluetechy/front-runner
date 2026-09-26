package com.frontrunner.keycloak.sms;

import java.util.List;
import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

/**
 * The same step for the password grant, registered separately because it is a
 * separate execution in a separate flow.
 *
 * <p>Two factories for what reads like one feature is not duplication: the
 * browser flow and the direct grant are different conversations, and a realm
 * binds each one by id. Shipping only the browser half is the standard way a
 * second factor ends up with a hole in it -- the token endpoint keeps
 * answering to a password alone, and the login card is the thing asking for a
 * code.
 */
public class SmsDirectGrantAuthenticatorFactory implements AuthenticatorFactory {
    public static final String PROVIDER_ID = "sms-direct-grant";

    private final SmsGateway gateway = new SmsGateway();

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "SMS code (direct grant)";
    }

    @Override
    public String getHelpText() {
        return "Texts a six-digit code and expects it back on the next grant as sms_code. "
                + "The grant with no code in it is refused in the same words a wrong password is.";
    }

    @Override
    public String getReferenceCategory() {
        return "otp";
    }

    @Override
    public Authenticator create(KeycloakSession session) {
        return new SmsDirectGrantAuthenticator(gateway);
    }

    @Override
    public AuthenticationExecutionModel.Requirement[] getRequirementChoices() {
        return SmsAuthenticator.requirementChoices();
    }

    @Override
    public boolean isUserSetupAllowed() {
        return SmsDirectGrantAuthenticator.userSetupAllowed();
    }

    @Override
    public boolean isConfigurable() {
        return false;
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return List.of();
    }

    @Override
    public void init(Config.Scope config) {
        // Nothing: SmsGateway reads the environment.
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // Nothing to wire.
    }

    @Override
    public void close() {
        // Nothing held.
    }
}
