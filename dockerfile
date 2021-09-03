FROM node:12-alpine
RUN apk add --no-cache bash
RUN apk update
RUN apk add git

RUN wget -q -O /tmp/docker.tgz \
    https://download.docker.com/linux/static/stable/x86_64/docker-17.12.1-ce.tgz && \
    tar -C /tmp -xzvf /tmp/docker.tgz && \
    mv /tmp/docker/docker /bin/docker && \
    chmod +x /bin/docker && \
    rm -rf /tmp/docker*

WORKDIR /home/node

COPY . .

RUN npm install
ENV PATH /home/node/node_modules/.bin:$PATH

VOLUME /home/node/project

CMD node index.js
