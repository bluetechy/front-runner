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
