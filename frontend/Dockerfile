# Stage 1: Build React Application
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

# Set default port env variable for Nginx template processing
ENV PORT=10000

# Copy custom Nginx configuration template
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Copy built production assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
