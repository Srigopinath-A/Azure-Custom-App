package com.example.azureresourcelisting.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class DeviceCodeResponse {
    private String userCode;
    // FIX: Renamed from 'verificationUri' to match what the frontend expects
    private String verificationUrl;
    private String message;
}