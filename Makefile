########################################################################
# CONSTANTS FOR MAKEFILE
########################################################################

PROJECT_UID = front-runner
PROJECT_ENV = dev
PROJECT_NAME = ${PROJECT_UID}-${PROJECT_ENV}

########################################################################
# RULES FOR DOCKER COMPOSE
########################################################################

# make dc3-build
dc3-build: dc3-down
	docker-compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml build

# make dc3-build-api
dc3-build-api: dc3-down
	docker-compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml build main-api

# make dc3-build-cache
dc3-build-cache: dc3-down
	docker-compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml build main-kvs

# make dc3-build-db
dc3-build-db: dc3-down
	docker-compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml build main-db

# make dc3-build-gui
dc3-build-gui: dc3-down
	docker-compose -p $(PROJECT_NAME) -f docker-compose-$(PROJECT_ENV).yml build main-gui

# make dc3-up
dc3-up: dc3-down
	docker-compose -p ${PROJECT_NAME} -f docker-compose-${PROJECT_ENV}.yml up

# make dc3-up-d
dc3-up-d: dc3-down
	docker-compose -p ${PROJECT_NAME} -f docker-compose-${PROJECT_ENV}.yml up -d

# make dc3-down
dc3-down:
	docker-compose -p ${PROJECT_NAME} -f docker-compose-${PROJECT_ENV}.yml down
	docker-compose -p ${PROJECT_NAME} -f docker-compose-${PROJECT_ENV}.yml rm -f
