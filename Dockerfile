FROM node:18-alpine
LABEL org.opencontainers.image.authors="hoya@mychar.info"
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
RUN npm run build
CMD ["node", "build/index.js"]