FROM node:14-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=prod --silent

COPY ./dist ./dist
COPY ./config.json ./config.json
COPY ./keys ./keys

EXPOSE 4000
CMD [ "npm", "start" ]
