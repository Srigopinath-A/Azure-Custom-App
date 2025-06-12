package com.example.azureresourcelisting.service;

import com.azure.resourcemanager.AzureResourceManager;
import com.azure.resourcemanager.resources.models.GenericResource;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AzureResourceService {

    // --- FIX: NO @Autowired CONSTRUCTOR OR private final 'azure' FIELD ---
    // The service is now stateless. It does not hold its own Azure connection.
    public AzureResourceService() {
        System.out.println("Stateless AzureResourceService has been created.");
    }

    /**
     * Lists all queryable resources in the subscription associated with the provided Azure client.
     * This method is now more efficient by using the generic lister.
     *
     * @param azure The authenticated AzureResourceManager client for the user's session.
     * @return A list of strings, each describing a resource.
     */
    public List<String> listAllResources(AzureResourceManager azure) {
        System.out.println("Service: Listing all resources for subscription: " + azure.subscriptionId());
        
        List<String> resources = new ArrayList<>();
        
        // Using genericResources().list() is the most comprehensive way to get all resources.
        azure.genericResources().list().forEach(resource -> {
            // Create a consistent format for the resource string.
            String resourceString = String.format("Name: %s | Type: %s | Group: %s",
                resource.name(),
                resource.resourceType(),
                resource.resourceGroupName()
            );
            resources.add(resourceString);
        });

        if (resources.isEmpty()) {
            System.out.println("Service: No resources found in subscription: " + azure.subscriptionId());
        }

        return resources;
    }

    /**
     * Finds a resource by its name anywhere in the subscription and returns its tags.
     * This is a potentially slow operation as it scans the entire subscription.
     *
     * @param azure        The authenticated AzureResourceManager client for the user's session.
     * @param resourceName The name of the resource to find.
     * @return A map of tags for the found resource, or null if the resource is not found.
     */
    public Map<String, String> getTagsByName(AzureResourceManager azure, String resourceName) {
        System.out.println("Service: Starting subscription-wide search for resource '" + resourceName + "' to get tags.");

        // Search ALL generic resources in the subscription.
        Optional<GenericResource> genericResourceOptional = azure.genericResources().list().stream()
                .filter(resource -> resource.name().equalsIgnoreCase(resourceName))
                .findFirst();

        // If the resource was found, map it to its tags. Otherwise, return null.
        if (genericResourceOptional.isPresent()){
            System.out.println("Service: Found resource '" + resourceName + "'. Returning its tags.");
            return genericResourceOptional.get().tags();
        } else {
            System.err.println("Service: Resource '" + resourceName + "' not found.");
            return null;
        }
    }

    /**
     * Finds a resource by name anywhere in the subscription, then updates its tags.
     * Note: This REPLACES all existing tags with the new set provided.
     *
     * @param azure         The authenticated AzureResourceManager client for the user's session.
     * @param resourceName  The name of the resource to update.
     * @param tagsToApply   The new and complete set of tags to apply to the resource.
     * @return The complete, updated map of tags for the resource, or null if the resource was not found.
     */
    public Map<String, String> updateTagsByName(AzureResourceManager azure, String resourceName, Map<String, String> tagsToApply) {
        System.out.println("Service: Starting subscription-wide search for resource '" + resourceName + "' to update tags.");

        // We must first find the resource to get an updatable object.
        Optional<GenericResource> resourceOptional = azure.genericResources().list().stream()
                .filter(r -> r.name().equalsIgnoreCase(resourceName))
                .findFirst();

        if (resourceOptional.isPresent()) {
            GenericResource resourceToUpdate = resourceOptional.get();
            System.out.println("Service: Found resource '" + resourceName + "' in group '" + resourceToUpdate.resourceGroupName() + "'. Applying tags...");

            // The .withTags() method REPLACES the entire tag set.
            // The frontend should handle merging if that's the desired behavior.
            GenericResource.Update update = resourceToUpdate.update();
            GenericResource updatedResource = update.withTags(tagsToApply).apply();

            System.out.println("Service: Successfully updated tags for resource '" + resourceName + "'.");
            
            // Best practice: return the tags from the final object returned by the .apply() call.
            return updatedResource.tags();
        } else {
            System.err.println("Service ERROR: Failed to update tags. Resource '" + resourceName + "' was not found in the subscription.");
            return null; // Signals to the controller that the resource was not found.
        }
    }
}