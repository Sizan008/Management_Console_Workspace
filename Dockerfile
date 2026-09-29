# Stage 1 - Build Angular App
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run ng build

# Stage 2 - Deploy with Nginx
FROM nginx:1.18.0-alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/dist/Sentinel/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY config.json.template /etc/nginx/config.json.template

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh

EXPOSE 4001

ENTRYPOINT ["/docker-entrypoint.sh"]
