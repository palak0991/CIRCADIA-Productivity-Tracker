package com.visualizer.hour24.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
@Slf4j
public class DatabaseConfig {

    private final DataSourceProperties properties;

    public DatabaseConfig(DataSourceProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void normalizeDataSourceProperties() {
        String url = properties.getUrl();
        if (url == null || url.isBlank()) {
            return;
        }

        url = url.trim();

        // Handle Render postgres:// or postgresql:// connection strings
        if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
            try {
                // Replace scheme with http:// so java.net.URI can parse user, host, port, path
                String parseable = url.replaceFirst("^postgres(ql)?://", "http://");
                URI uri = new URI(parseable);

                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath(); // e.g. "/visualizer24"
                String query = uri.getQuery();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + (path != null ? path : "");
                if (query != null && !query.isBlank()) {
                    jdbcUrl += "?" + query;
                }

                properties.setUrl(jdbcUrl);
                log.info("Normalized Render PostgreSQL URI into valid JDBC URL: jdbc:postgresql://{}:{}{}", host, port, path);

                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isBlank()) {
                    String[] credentials = userInfo.split(":", 2);
                    if (credentials.length > 0 && (properties.getUsername() == null || properties.getUsername().isBlank() || "postgres".equals(properties.getUsername()))) {
                        properties.setUsername(credentials[0]);
                    }
                    if (credentials.length > 1 && (properties.getPassword() == null || properties.getPassword().isBlank() || "postgres".equals(properties.getPassword()))) {
                        properties.setPassword(credentials[1]);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse PostgreSQL URI, prefixing jdbc:: {}", e.getMessage());
                if (!url.startsWith("jdbc:")) {
                    properties.setUrl("jdbc:" + url);
                }
            }
        }
    }
}
