########################################################################
# CONSTANTS FOR MAKEFILE
########################################################################

PROJECT_UID = front-runner
PROJECT_ENV = dev
PROJECT_NAME = ${PROJECT_UID}-${PROJECT_ENV}

COMPOSE = docker compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml

########################################################################
# RULES FOR DOCKER COMPOSE
########################################################################

# make dc3-build
dc3-build: dc3-down
	$(COMPOSE) build

# make dc3-build-api
dc3-build-api: dc3-down
	$(COMPOSE) build main-api

# make dc3-build-cache
dc3-build-cache: dc3-down
	$(COMPOSE) build main-kvs

# make dc3-build-db
dc3-build-db: dc3-down
	$(COMPOSE) build main-db

# make dc3-build-gui
dc3-build-gui: dc3-down
	$(COMPOSE) build main-gui

# make dc3-up
dc3-up: dc3-down
	$(COMPOSE) up

# make dc3-up-d
dc3-up-d: dc3-down
	$(COMPOSE) up -d

# make dc3-down
dc3-down:
	$(COMPOSE) down --remove-orphans

# make dc3-clean - like dc3-down, but also discards the database volume
dc3-clean:
	$(COMPOSE) down --remove-orphans --volumes

# make dc3-logs
dc3-logs:
	$(COMPOSE) logs -f

# make dc3-psql - open a psql shell on the running database
dc3-psql:
	$(COMPOSE) exec main-db psql -U $${POSTGRES_USER:-postgres} -d $${APP_DB_NAME:-dbo}

########################################################################
# RULES FOR THE DATABASE
#
# The schema is built once, when the container first starts on an empty
# volume. Seeding and testing are separate and on demand.
########################################################################

# make db-rebuild - drop the database and build the schema again from
# apps/main-db/sql, without discarding the volume or the container. This is
# how a schema change is applied; it leaves the database empty.
db-rebuild:
	$(COMPOSE) exec main-db /opt/main-db/bin/rebuild.sh

# make db-seed - load the demo dataset for working against the API and GUI.
# Idempotent, so it is safe to run over an already-seeded database.
db-seed:
	$(COMPOSE) exec main-db /opt/main-db/bin/seed.sh

# make db-reseed - empty every table first, so the result is exactly the
# demo dataset and nothing else
db-reseed:
	$(COMPOSE) exec main-db /opt/main-db/bin/seed.sh --reset

# make db-test - run the database test suite against a throwaway database
# built from the same SQL. Never touches the application database.
# Filter with: make db-test ARGS="--test-name-pattern=Tallies"
db-test:
	npm run test --workspace main-db -- $(ARGS)

# make db-test-watch - the same suite, re-run on every SQL or test change
db-test-watch:
	npm run test:watch --workspace main-db
