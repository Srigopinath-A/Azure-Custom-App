package com.example.azureresourcelisting.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // This configuration allows your React app (on port 3000)
                // to communicate with your backend.
                registry.addMapping("/api/**") // Apply to all endpoints under /api
                    .allowedOrigins("http://localhost:3000") // Whitelist your React frontend's origin
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Allowed HTTP methods
                    .allowedHeaders("*") // Allow all headers
                    .allowCredentials(true); // Allow cookies/session info to be sent
            }
        };
    }
}