# syntax=docker/dockerfile:1

#
# Keycloak, built for PostgreSQL rather than the embedded development store,
# and carrying this repository's own SMS authenticator.
#
# Three stages. The first compiles the provider in ./plugin; the second drops
# the JAR into /opt/keycloak/providers and runs `kc.sh build`, which is what
# bakes the database vendor, the feature set *and the providers* into the image
# so that `start --optimized` skips the rebuild it would otherwise do on every
# boot. Changing KC_DB or the plugin here means rebuilding the image, not just
# restarting the container.
#
FROM maven:3.9-eclipse-temurin-21 AS plugin

WORKDIR /plugin
# The POM on its own first, so that a change to the Java does not re-download
# Keycloak's whole dependency tree.
COPY ./plugin/pom.xml ./pom.xml
RUN mvn -B -q dependency:go-offline
COPY ./plugin/src ./src
RUN mvn -B -q package

FROM quay.io/keycloak/keycloak:26.7.4 AS builder

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true

# Before the build, not after: `kc.sh build` indexes what is in this directory,
# and a provider added afterwards is a provider Keycloak will not see until
# somebody works out why the realm's flow names an authenticator that does not
# exist.
COPY --from=plugin /plugin/target/keycloak-sms-authenticator.jar /opt/keycloak/providers/

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.7.4

COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Imported on first start, when the realm does not exist yet. Editing it and
# restarting changes nothing -- Keycloak's own database is the source of truth
# once the realm is there. See README.md for how to start over.
COPY ./realm /opt/keycloak/data/import

# Every credential and address is supplied at run time from the .env file at
# the repository root; nothing secret is baked in here. That includes the two
# the SMS authenticator reads for itself, SMS_GATEWAY_URL and
# SMS_GATEWAY_SECRET -- see plugin/src/main/java/.../SmsGateway.java for why
# they are environment variables rather than realm configuration.
EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
