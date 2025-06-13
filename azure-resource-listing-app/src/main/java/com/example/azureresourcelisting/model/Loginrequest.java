package com.example.azureresourcelisting.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
public class Loginrequest {

    private String tenantId;
    private String subscriptionId;
}