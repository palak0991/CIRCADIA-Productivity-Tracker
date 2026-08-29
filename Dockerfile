# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React frontend
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build the Spring Boot backend fat jar
# ────────────────────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS backend-build

WORKDIR /app/backend

COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

COPY backend/src ./src
RUN mvn clean package -DskipTests -B

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — Nginx serving the React SPA
# ────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS frontend

COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# ────────────────────────────────────────────────────────────────────────────
# Stage 4 — Spring Boot runtime (JRE only, non-root)
# ────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS backend

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

COPY --from=backend-build /app/backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
