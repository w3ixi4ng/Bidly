FROM node:20-alpine
RUN apk upgrade --no-cache zlib
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
CMD [ "node", "server.js" ]
