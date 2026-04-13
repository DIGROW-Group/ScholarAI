FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose server port
EXPOSE 5001

# Set working directory to server
WORKDIR /app/server

# Start the server
CMD ["node", "index.js"]

