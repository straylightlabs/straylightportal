FROM node:8

WORKDIR /usr/src/app
COPY package*.json ./
COPY index.js .
COPY server .
COPY public .

RUN npm install

EXPOSE 8080
CMD [ "npm", "start" ]
