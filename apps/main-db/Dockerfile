# syntax=docker/dockerfile:1

FROM postgres:18.6

# The schema and the bootstrap script that applies it on first start. Every
# credential and database name is read from the environment at run time (see
# the .env file at the repository root), so nothing secret is baked in here.
COPY ./sql /sql
COPY --chmod=0755 ./init.sh /docker-entrypoint-initdb.d/init.sh

EXPOSE 5432
