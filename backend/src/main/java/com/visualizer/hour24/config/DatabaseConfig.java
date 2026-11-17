package com.visualizer.hour24.config;

import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class DatabaseConfig {

    private final DataSourceProperties properties;

    public DatabaseConfig(DataSourceProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void normalizeJdbcUrl() {
        String url = properties.getUrl();
        if (url != null && url.startsWith("postgresql://")) {
            properties.setUrl("jdbc:" + url);
        }
    }
}
