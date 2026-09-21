FROM node:14.11.0-alpine as stage1

#Setup working directory
WORKDIR /app

RUN apk update && \
    apk upgrade && \
    apk add --no-cache bash git vim

#Copy source files
COPY ./package.json /app

#Install dependencies
RUN npm install
RUN npm rebuild node-sass

FROM stage1 as stage2
COPY . .

#Running the app
CMD ["npm", "run", "start"]
