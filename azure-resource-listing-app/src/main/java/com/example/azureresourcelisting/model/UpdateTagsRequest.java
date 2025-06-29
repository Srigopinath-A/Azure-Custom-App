package com.example.azureresourcelisting.model;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
public class UpdateTagsRequest {
    private String resourceName;
    private Map<String, String> tags;
}
