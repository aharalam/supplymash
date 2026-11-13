FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG API_URL=http://backend:3001
ENV API_URL=$API_URL
RUN npm run build
EXPOSE 5173
CMD ["npm", "start"]
