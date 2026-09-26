package com.frontrunner.keycloak.sms;

import org.jboss.logging.Logger;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.models.RealmModel;
import org.keycloak.representations.userprofile.config.UPConfig;
import org.keycloak.userprofile.UserProfileProvider;

/**
 * The one piece of realm configuration this feature needs that a realm import
 * cannot carry.
 *
 * <p>Keycloak 24 turned the declarative user profile on for every realm and
 * disabled unmanaged attributes with it: an attribute the profile does not
 * declare is silently dropped on an admin write. The phone number an SMS
 * factor is sent to is exactly such an attribute, so without this main-api
 * writes it, Keycloak accepts the request, and the number is not there
 * afterwards.
 *
 * <p>The fix belongs in the realm import and cannot go there.
 * {@code front-runner-realm.json} can name flows, clients, users and an OTP
 * policy, but the user profile is held in a component that the importer does
 * not create -- verified against 26.7.4 by importing one and finding the realm
 * still on the stock four attributes. So it is applied here, from a listener
 * on realm creation, which is the earliest moment a realm exists to apply it
 * to.
 *
 * <p>{@code ADMIN_EDIT} rather than {@code ENABLED}: unmanaged attributes
 * become readable and writable by an administrator and by main-api's service
 * account, and stay invisible to the account holder's own profile forms.
 * Nobody should be able to type their way to a second factor pointing at
 * another handset, and the account pages are where they would try.
 *
 * <p>An existing realm is not touched, because it already exists and this
 * fires on creation. See apps/keycloak-idp/README.md for the one line that
 * applies it by hand.
 */
final class SmsRealmSetup {
    private static final Logger LOG = Logger.getLogger(SmsRealmSetup.class);

    /**
     * Keycloak's own administration realm, which nothing in this product lives
     * in. Left exactly as Keycloak shipped it: this feature has no business
     * loosening the profile rules on the realm the administrators are in.
     */
    private static final String KEYCLOAK_OWN_REALM = "master";

    private SmsRealmSetup() {}

    /** Listen for realms being created, including by the import on first boot. */
    static void install(KeycloakSessionFactory factory) {
        factory.register(event -> {
            if (event instanceof RealmModel.RealmPostCreateEvent created
                    && !KEYCLOAK_OWN_REALM.equals(created.getCreatedRealm().getName())) {
                allowUnmanagedAttributes(
                        created.getKeycloakSession(), created.getCreatedRealm());
            }
        });
    }

    private static void allowUnmanagedAttributes(KeycloakSession session, RealmModel realm) {
        try {
            session.getContext().setRealm(realm);
            UserProfileProvider profiles = session.getProvider(UserProfileProvider.class);
            UPConfig config = profiles.getConfiguration();
            if (config.getUnmanagedAttributePolicy() != null) {
                return;
            }
            config.setUnmanagedAttributePolicy(UPConfig.UnmanagedAttributePolicy.ADMIN_EDIT);
            profiles.setConfiguration(config);
            LOG.info("Allowed admin-managed unmanaged attributes on realm " + realm.getName()
                    + ", so a phone number can be attached as a second factor");
        } catch (Exception failure) {
            // Logged rather than thrown: a realm that fails to be created
            // because of this would be a far worse outcome than an SMS factor
            // that cannot be attached until somebody reads the README.
            LOG.warn("Could not allow unmanaged attributes on realm " + realm.getName() + ": "
                    + failure.getMessage());
        }
    }
}
