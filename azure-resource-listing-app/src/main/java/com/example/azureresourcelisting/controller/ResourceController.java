package com.example.azureresourcelisting.controller;

import com.azure.core.management.AzureEnvironment;
import com.azure.core.management.profile.AzureProfile;
import com.azure.identity.DeviceCodeCredential;
import com.azure.identity.DeviceCodeCredentialBuilder;
import com.azure.resourcemanager.AzureResourceManager;
import com.example.azureresourcelisting.model.DeviceCodeResponse;
import com.example.azureresourcelisting.model.Loginrequest;
import com.example.azureresourcelisting.model.UpdateTagsRequest;
import com.example.azureresourcelisting.service.AzureResourceService;
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

    // In-memory storage for pending login attempts.
    private static final Map<String, PendingLogin> PENDING_LOGINS_MAP = new ConcurrentHashMap<>();
    private static final String AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";

    // Inner class to hold the credential and timestamp for a pending login.
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

    // Helper to safely get the Azure client from the user's session.
    private AzureResourceManager getAzureFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false); // false = don't create a new session if one doesn't exist
        return (session != null) ? (AzureResourceManager) session.getAttribute("AZURE_SESSION") : null;
    }
    
    // Endpoint for frontend to start the login process.
   
    @PostMapping("/login/start")
    public ResponseEntity<?> startLogin(@RequestBody Loginrequest loginRequest) {
        if (loginRequest == null || loginRequest.getTenantId() == null || loginRequest.getSubscriptionId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tenant ID and Subscription ID are required."));
        }
    
        String loginId = UUID.randomUUID().toString();
        
        // This AtomicReference is perfectly fine to use.
        final AtomicReference<DeviceCodeResponse> deviceCodeResponse = new AtomicReference<>();
    
        try {
            // Build the credential. The key is that the challengeConsumer block
            // IS EXECUTED SYNCHRONOUSLY as part of the .build() process.
            DeviceCodeCredential credential = new DeviceCodeCredentialBuilder()
                    .tenantId(loginRequest.getTenantId())
                    .clientId(AZURE_CLI_CLIENT_ID)
                    .challengeConsumer(challenge -> {
                        // This block is guaranteed to run BEFORE the .build() method returns.
                        // This is where we populate our response object.
                        System.out.println("Challenge received from Azure. User code: " + challenge.getUserCode());
                        deviceCodeResponse.set(new DeviceCodeResponse(
                                challenge.getUserCode(),
                                challenge.getVerificationUrl(),
                                challenge.getMessage()
                        ));
                    })
                    .build();
            
            // --- THIS IS THE CRITICAL FIX ---
            // Check if the consumer was actually called. If not, it means the SDK
            // failed to get the challenge from Microsoft for some reason (e.g., network issue,
            // invalid tenant ID) before it could even generate a code.
            if (deviceCodeResponse.get() == null) {
                System.err.println("CRITICAL ERROR: DeviceCodeCredentialBuilder completed but the challenge consumer was not called.");
                throw new IllegalStateException("Failed to get a device code challenge from Azure. Please check tenant ID and network connectivity.");
            }
    
            // Now that we have the credential object and we know the DTO is populated,
            // we can store the credential for the polling step.
            PENDING_LOGINS_MAP.put(loginId, new PendingLogin(credential));
    
            // It is now safe to return the response because we have confirmed
            // that deviceCodeResponse.get() is not null.
            return ResponseEntity.ok(Map.of(
                    "loginId", loginId,
                    "deviceCodeInfo", deviceCodeResponse.get()
            ));
    
        } catch (Exception e) {
            // This will now catch the IllegalStateException from above, or any other
            // error from the Azure SDK itself (like MsalServiceException).
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to start authentication. " + e.getMessage()));
        }
    }

    // Endpoint for the frontend to poll to see if the user has completed the login.
    @PostMapping("/login/check/{loginId}")
    public ResponseEntity<?> checkLogin(@PathVariable String loginId, @RequestBody Loginrequest loginRequest, HttpServletRequest servletRequest) {
        PendingLogin pendingLogin = PENDING_LOGINS_MAP.get(loginId);
        if (pendingLogin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Login session expired or not found. Please start over."));
        }
        try {
            // This is the magic. We try to use the credential. It will only work if the user has signed in.
            AzureProfile profile = new AzureProfile(loginRequest.getTenantId(), loginRequest.getSubscriptionId(), AzureEnvironment.AZURE);
            AzureResourceManager azure = AzureResourceManager.authenticate(pendingLogin.credential, profile).withDefaultSubscription();

            // SUCCESS! Store the authenticated client in the user's HTTP session.
            servletRequest.getSession(true).setAttribute("AZURE_SESSION", azure);
            PENDING_LOGINS_MAP.remove(loginId); // Clean up

            return ResponseEntity.ok(Map.of("message", "Authentication successful!"));
        } catch (Exception e) {
            // This is the EXPECTED case when the user hasn't finished logging in yet.
            // Tell the frontend to keep polling.
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