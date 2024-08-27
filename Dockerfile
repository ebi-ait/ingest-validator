FROM quay.io/ebi-ait/ingest-base-images:node_carbon

# Create app directory
RUN mkdir /app
WORKDIR /app

COPY package*.json ./
RUN npm install

ADD src ./src
ADD config ./config
COPY tsconfig.json ./

CMD ["npm", "start"]
