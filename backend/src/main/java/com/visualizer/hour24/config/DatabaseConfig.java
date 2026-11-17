package com.visualizer.hour24.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSource dataSource(
            @Value("${spring.datasource.url:${DB_URL:}}") String rawUrl,
            @Value("${spring.datasource.username:${DB_USERNAME:}}") String defaultUsername,
            @Value("${spring.datasource.password:${DB_PASSWORD:}}") String defaultPassword,
            @Value("${DB_HOST:}") String dbHost,
            @Value("${DB_PORT:5432}") String dbPort,
            @Value("${POSTGRES_DB:visualizer24}") String postgresDb) {

        String jdbcUrl;
        String username = defaultUsername;
        String password = defaultPassword;

        if (rawUrl != null && !rawUrl.isBlank()) {
            rawUrl = rawUrl.trim();
            if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
                try {
                    String parseable = rawUrl.replaceFirst("^postgres(ql)?://", "http://");
                    URI uri = new URI(parseable);
                    String host = uri.getHost();
                    int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                    String path = uri.getPath();
                    String query = uri.getQuery();

                    jdbcUrl = "jdbc:postgresql://" + host + ":" + port + (path != null ? path : "/visualizer24");
                    if (query != null && !query.isBlank()) {
                        jdbcUrl += "?" + query;
                    }

                    String userInfo = uri.getUserInfo();
                    if (userInfo != null && !userInfo.isBlank()) {
                        String[] parts = userInfo.split(":", 2);
                        if (parts.length > 0 && !parts[0].isBlank()) {
                            username = parts[0];
                        }
                        if (parts.length > 1 && !parts[1].isBlank()) {
                            password = parts[1];
                        }
                    }
                    log.info("Successfully converted cloud PostgreSQL URI to JDBC URL: jdbc:postgresql://{}:{}{}", host, port, path);
                } catch (Exception e) {
                    log.warn("Failed to parse PostgreSQL URI {}, prepending jdbc:: {}", rawUrl, e.getMessage());
                    jdbcUrl = "jdbc:" + rawUrl;
                }
            } else if (!rawUrl.startsWith("jdbc:")) {
                jdbcUrl = "jdbc:" + rawUrl;
            } else {
                jdbcUrl = rawUrl;
            }
        } else if (dbHost != null && !dbHost.isBlank()) {
            jdbcUrl = "jdbc:postgresql://" + dbHost + ":" + dbPort + "/" + postgresDb;
        } else {
            jdbcUrl = "jdbc:h2:mem:visualizer24;DB_CLOSE_DELAY=-1;MODE=PostgreSQL";
            username = "sa";
            password = "";
        }

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        if (username != null && !username.isBlank()) {
            ds.setUsername(username);
        }
        if (password != null && !password.isBlank()) {
            ds.setPassword(password);
        }
        ds.setDriverClassName(jdbcUrl.startsWith("jdbc:postgresql:") ? "org.postgresql.Driver" : "org.h2.Driver");

        // Pool sizing optimized for Render free tier
        ds.setMaximumPoolSize(5);
        ds.setMinimumIdle(1);
        ds.setIdleTimeout(30000);
        ds.setConnectionTimeout(20000);
        ds.setMaxLifetime(1800000);

        return ds;
    }
}
