FROM --platform=linux/amd64 node:14  as builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM --platform=linux/amd64 nginx
EXPOSE 80
COPY --from=builder /app/build /usr/share/nginx/html