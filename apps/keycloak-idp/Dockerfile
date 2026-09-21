# syntax=docker/dockerfile:1

#
# Keycloak, built for PostgreSQL rather than the embedded development store.
#
# The two stages are Keycloak's own prescription: `kc.sh build` bakes the
# database vendor and feature set into the image so that `start --optimized`
# skips the rebuild it would otherwise do on every boot. Changing KC_DB here
# means rebuilding the image, not just restarting the container.
#
FROM quay.io/keycloak/keycloak:26.7.4 AS builder

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.7.4

COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Imported on first start, when the realm does not exist yet. Editing it and
# restarting changes nothing -- Keycloak's own database is the source of truth
# once the realm is there. See README.md for how to start over.
COPY ./realm /opt/keycloak/data/import

# Every credential and address is supplied at run time from the .env file at
# the repository root; nothing secret is baked in here.
EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
