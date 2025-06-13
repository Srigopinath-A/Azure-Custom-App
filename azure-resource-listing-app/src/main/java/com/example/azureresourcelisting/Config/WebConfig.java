package com.example.azureresourcelisting.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Apply this rule to all your API endpoints
                
                // --- THIS IS THE MOST IMPORTANT LINE ---
                // Allow your React app's origin. 
                // We will add BOTH localhost and 127.0.0.1 to be safe.
                .allowedOrigins("http://localhost:3000", "http://127.0.0.1:3000") 
                
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Allow all necessary methods
                .allowedHeaders("*") // Allow all headers
                .allowCredentials(true); // Allow cookies to be sent for session management
    }
}