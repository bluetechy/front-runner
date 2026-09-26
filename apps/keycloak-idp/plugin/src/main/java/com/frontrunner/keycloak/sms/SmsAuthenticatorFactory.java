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
 * How Keycloak finds the browser SMS step, and what it is called in the
 * console.
 *
 * <p>The id is what the realm import names in its flow, so it is part of the
 * contract with apps/keycloak-idp/realm/front-runner-realm.json and cannot be
 * renamed on its own.
 *
 * <p>Nothing is configurable per realm, on purpose. The two settings this
 * needs -- where main-api is and the secret to present to it -- are read from
 * the environment by {@link SmsGateway}, because a secret in realm
 * configuration is a secret in the realm export, and the realm export is a
 * file in this repository.
 */
public class SmsAuthenticatorFactory implements AuthenticatorFactory {
    public static final String PROVIDER_ID = "sms-authenticator";

    private final SmsGateway gateway = new SmsGateway();

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "SMS code";
    }

    @Override
    public String getHelpText() {
        return "Texts a six-digit code to the number on the account and asks for it back. "
                + "The number is attached on the security page, never here.";
    }

    @Override
    public String getReferenceCategory() {
        return "otp";
    }

    @Override
    public Authenticator create(KeycloakSession session) {
        return new SmsAuthenticator(gateway);
    }

    @Override
    public AuthenticationExecutionModel.Requirement[] getRequirementChoices() {
        return SmsAuthenticator.requirementChoices();
    }

    /**
     * False, and this is a decision rather than a default. "User setup
     * allowed" would have Keycloak offer to attach a phone number in the
     * middle of a login, and attaching one means sending a message to it and
     * having it answered -- which belongs on the security page, where somebody
     * has already proved who they are.
     */
    @Override
    public boolean isUserSetupAllowed() {
        return false;
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
        // Nothing: see the class comment on where the settings come from.
    }

    /**
     * Where the realm gets the one setting the import cannot carry. See
     * {@link SmsRealmSetup}: without it, the phone number main-api writes onto
     * an account is silently dropped.
     */
    @Override
    public void postInit(KeycloakSessionFactory factory) {
        SmsRealmSetup.install(factory);
    }

    @Override
    public void close() {
        // Nothing held.
    }
}
