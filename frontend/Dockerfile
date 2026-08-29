# Stage 1: Build React Application
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html
# Copy default nginx config if needed, otherwise standard Nginx setup works
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
