FROM node:6

WORKDIR /ssl

RUN openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365 -nodes -batch
RUN openssl rsa -in keytmp.pem -out key.pem

COPY index.js index.js
COPY package.json package.json

RUN npm install

EXPOSE 9080
EXPOSE 9443

ENTRYPOINT ["npm"]

CMD ["start"]

VOLUME ["/upload"]

VOLUME ["/public_id"]