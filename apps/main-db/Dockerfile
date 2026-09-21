FROM postgres:latest

ENV POSTGRES_DB admin
ENV POSTGRES_PASSWORD admin

COPY ./sql /sql
COPY ./init.sh /docker-entrypoint-initdb.d/init.sh

RUN chmod +x /docker-entrypoint-initdb.d/init.sh

EXPOSE 5432
