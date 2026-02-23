FROM node:24-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

EXPOSE 8081

CMD ["npm", "start"]