FROM alpine
RUN apk update
RUN apk upgrade
RUN apk add --update nodejs nodejs-npm
RUN rm -rf /var/cache/apk/*
COPY src/package.json package.json
COPY src/server.js server.js
RUN mkdir html
COPY html/index.html html/index.html
COPY html/pong.js html/pong.js
RUN npm install
EXPOSE 80 443 1337

CMD ["npm","start"]
