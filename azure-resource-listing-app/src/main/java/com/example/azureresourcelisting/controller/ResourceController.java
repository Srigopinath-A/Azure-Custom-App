package com.example.azureresourcelisting.controller;

import com.azure.core.http.HttpClient;
import com.azure.core.http.netty.NettyAsyncHttpClientBuilder;
import com.azure.core.management.AzureEnvironment;
import com.azure.core.management.profile.AzureProfile;
import com.azure.identity.DeviceCodeCredential;
import com.azure.identity.DeviceCodeCredentialBuilder;
import com.azure.resourcemanager.AzureResourceManager;
import com.example.azureresourcelisting.model.DeviceCodeResponse;
import com.example.azureresourcelisting.model.Loginrequest;
import com.example.azureresourcelisting.model.UpdateTagsRequest;
import com.example.azureresourcelisting.service.AzureResourceService;
import com.microsoft.aad.msal4j.MsalServiceException;

import com.azure.core.http.netty.NettyAsyncHttpClientBuilder;
import com.azure.core.http.HttpClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;


@RestController
@RequestMapping("/api")
@EnableScheduling
public class ResourceController {

    private final AzureResourceService azureResourceService;
    private static final Map<String, PendingLogin> PENDING_LOGINS_MAP = new ConcurrentHashMap<>();
    private static final String AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";

    static class PendingLogin {
        final DeviceCodeCredential credential;
        final long createdAt;

        PendingLogin(DeviceCodeCredential credential) {
            this.credential = credential;
            this.createdAt = System.currentTimeMillis();
        }
    }

    public ResourceController(AzureResourceService azureResourceService) {
        this.azureResourceService = azureResourceService;
    }

    private AzureResourceManager getAzureFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return (session != null) ? (AzureResourceManager) session.getAttribute("AZURE_SESSION") : null;
    }

    @PostMapping("/login/start")
    public ResponseEntity<?> startLogin(@RequestBody Loginrequest loginRequest) {
        if (loginRequest.getTenantId() == null || loginRequest.getSubscriptionId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tenant ID and Subscription ID are required."));
        }

        String loginId = UUID.randomUUID().toString();
        final AtomicReference<DeviceCodeResponse> deviceCodeResponse = new AtomicReference<>();

        try {
            // Explicitly create the Netty HTTP client for stability
            HttpClient nettyHttpClient = new NettyAsyncHttpClientBuilder().build();

            DeviceCodeCredential credential = new DeviceCodeCredentialBuilder()
                .httpClient(nettyHttpClient)
                .tenantId(loginRequest.getTenantId())
                .clientId(AZURE_CLI_CLIENT_ID)
                .challengeConsumer(challenge -> {
                    // This block MUST be called by the SDK before .build() returns.
                    // This is where we capture the user code and URL.
                    System.out.println(">>> LOGIN CHALLENGE RECEIVED FROM AZURE: " + challenge.getMessage());
                    deviceCodeResponse.set(new DeviceCodeResponse(
                            challenge.getUserCode(),
                            challenge.getVerificationUrl(),
                            challenge.getMessage()
                    ));
                })
                .build();
            if (deviceCodeResponse.get() == null) {
                throw new IllegalStateException("The Azure SDK failed to get a device code. This is likely a proxy or a Tenant ID issue.");
            }

            // We have the credential, store it for the polling step.
            PENDING_LOGINS_MAP.put(loginId, new PendingLogin(credential));

            // Return the loginId and the device code info immediately.
            return ResponseEntity.ok(Map.of(
                    "loginId", loginId,
                    "deviceCodeInfo", deviceCodeResponse.get()
            ));

        } catch (MsalServiceException msalEx) {
            System.err.println("MSAL Service Exception: " + msalEx.getMessage());
            return ResponseEntity.status(msalEx.statusCode()).body(Map.of("error", "Azure Authentication Error: " + msalEx.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login/check/{loginId}")
    public ResponseEntity<?> checkLogin(@RequestBody Loginrequest loginRequest, @PathVariable String loginId, HttpServletRequest servletRequest) {
        PendingLogin pendingLogin = PENDING_LOGINS_MAP.get(loginId);
        if (pendingLogin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Login session expired."));
        }

        try {
            AzureProfile profile = new AzureProfile(loginRequest.getTenantId(), loginRequest.getSubscriptionId(), AzureEnvironment.AZURE);
            // This is the blocking call that will only succeed after the user signs in.
            AzureResourceManager azure = AzureResourceManager.authenticate(pendingLogin.credential, profile).withDefaultSubscription();

            // SUCCESS!
            servletRequest.getSession(true).setAttribute("AZURE_SESSION", azure);
            PENDING_LOGINS_MAP.remove(loginId);
            return ResponseEntity.ok(Map.of("message", "Authentication successful!"));

        } catch (Exception e) {
            // Any exception means the user has not finished logging in yet.
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("status", "PENDING"));
        }
    }

    // Endpoint for the frontend to check if a session is already active on page load.
    @GetMapping("/check-session")
    public ResponseEntity<?> checkSession(HttpServletRequest request) {
        return getAzureFromSession(request) != null ? ResponseEntity.ok().build() : ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    
    // Endpoint to log out and invalidate the session.
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok(Map.of("message", "Successfully logged out."));
    }

    // Scheduled task to clean up expired, incomplete login attempts.
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void cleanPendingLogins() {
        long now = System.currentTimeMillis();
        long expirationTime = 600000; // 10 minutes
        PENDING_LOGINS_MAP.entrySet().removeIf(entry -> (now - entry.getValue().createdAt) > expirationTime);
    }
    
    // --- Your Existing Endpoints, Now Session-Aware ---

    @GetMapping("/resources")
    public ResponseEntity<?> listResources(HttpServletRequest request) {
        AzureResourceManager azure = getAzureFromSession(request);
        if (azure == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated. Please log in."));
        
        List<String> resources = azureResourceService.listAllResources(azure);
        return ResponseEntity.ok(resources);
    }
    
    @GetMapping("/tags/{resourceName}")
    public ResponseEntity<?> getTagsByResourceName(@PathVariable String resourceName, HttpServletRequest request) {
        AzureResourceManager azure = getAzureFromSession(request);
        if (azure == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated. Please log in."));

        Map<String, String> tags = azureResourceService.getTagsByName(azure, resourceName);
        if (tags == null) {
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Resource not found."));
        }
        return ResponseEntity.ok(tags);
    }

    @PostMapping("/resource/update-tags")
    public ResponseEntity<?> updateTags(@RequestBody UpdateTagsRequest updateRequest, HttpServletRequest request) {
        AzureResourceManager azure = getAzureFromSession(request);
        if (azure == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated. Please log in."));

        Map<String, String> updatedTags = azureResourceService.updateTagsByName(azure, updateRequest.getResourceName(), updateRequest.getTags());
         if (updatedTags == null) {
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Resource not found."));
        }
        return ResponseEntity.ok(updatedTags);
    }
    
    @GetMapping("/resources/csv")
    public ResponseEntity<byte[]> exportResourcesToCsv(HttpServletRequest request) {
        AzureResourceManager azure = getAzureFromSession(request);
        if (azure == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);

        List<String> resources = azureResourceService.listAllResources(azure);
        StringBuilder csvBuilder = new StringBuilder("Resource\n");
        resources.forEach(res -> csvBuilder.append("\"").append(res.replace("\"", "\"\"")).append("\"\n"));
            
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=azure-resources.csv");
        headers.setContentType(MediaType.parseMediaType("text/csv"));
            
        return ResponseEntity.ok().headers(headers).body(csvBuilder.toString().getBytes(StandardCharsets.UTF_8));
    }
}