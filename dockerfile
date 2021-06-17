FROM node:12-alpine
RUN apk add --no-cache bash
RUN apk update
RUN apk add git

WORKDIR /home/node

COPY . .

RUN npm install
ENV PATH /home/node/node_modules/.bin:$PATH

CMD node index.js