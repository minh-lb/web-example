FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
USER node
EXPOSE 8000
CMD ["node", "dist/main.js"]
