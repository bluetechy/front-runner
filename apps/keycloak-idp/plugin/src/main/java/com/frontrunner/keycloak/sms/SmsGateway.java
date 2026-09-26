package com.frontrunner.keycloak.sms;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.jboss.logging.Logger;

/**
 * Asks main-api to carry a login code to a phone.
 *
 * <p>The split is deliberate and it is the whole architecture of this feature.
 * Keycloak decides whether a login proceeds, because that decision has to be
 * made somewhere a client cannot go around; main-api owns the Twilio
 * credentials and the wording of the message, because that is where every
 * other message this product sends is written. So this carries a number and
 * six digits across, and nothing else: it cannot send a message of its own
 * devising, and the endpoint at the other end would refuse one if it tried.
 *
 * <p>The address and the secret come from the environment rather than from
 * realm configuration. A secret in realm configuration is a secret in the
 * realm export, and the realm export is a file in this repository.
 *
 * <p>Nothing here is retried. A code that did not go out fails the login,
 * which is the honest outcome: the alternative is a form sitting there waiting
 * for digits that are not coming.
 */
final class SmsGateway {
    private static final Logger LOG = Logger.getLogger(SmsGateway.class);

    private static final String URL_VARIABLE = "SMS_GATEWAY_URL";
    private static final String SECRET_VARIABLE = "SMS_GATEWAY_SECRET";

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final String url;
    private final String secret;

    SmsGateway() {
        this(System.getenv(URL_VARIABLE), System.getenv(SECRET_VARIABLE));
    }

    SmsGateway(String url, String secret) {
        this.url = url == null ? "" : url.trim();
        this.secret = secret == null ? "" : secret.trim();
    }

    /**
     * Whether this Keycloak has anywhere to send a message.
     *
     * <p>Read before a code is generated, so that an installation without the
     * settings refuses the login rather than inventing a code nobody can
     * receive and then asking for it.
     */
    boolean available() {
        return !url.isEmpty() && !secret.isEmpty();
    }

    /**
     * Send one. Answers whether it went.
     *
     * <p>Every failure is the same answer, and none of them carries the number
     * or the code into the log: a log line is a copy of both in a place nobody
     * is watching.
     */
    boolean send(String phoneNumber, String code) {
        if (!available()) {
            LOG.warn("An SMS login code was needed, but " + URL_VARIABLE + " and "
                    + SECRET_VARIABLE + " are not both set");
            return false;
        }

        // Written by hand rather than through a JSON library, because the two
        // values in it are a number this code checked the shape of and six
        // digits this code generated. Nothing here came from a request.
        String body = "{\"phoneNumber\":\"" + phoneNumber + "\",\"code\":\"" + code + "\"}";

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("content-type", "application/json")
                    .header("x-sms-gateway-secret", secret)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                LOG.warn("The SMS gateway refused a login code: HTTP " + response.statusCode());
                return false;
            }
            // The gateway answers whether the message went, because a message
            // Twilio would not take is not the same as a gateway that is down
            // and both of them mean the login cannot proceed.
            return response.body() != null && response.body().contains("\"sent\":true");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            LOG.warn("Interrupted while sending an SMS login code");
            return false;
        } catch (Exception failure) {
            LOG.warn("Could not reach the SMS gateway: " + failure.getClass().getSimpleName());
            return false;
        }
    }
}
