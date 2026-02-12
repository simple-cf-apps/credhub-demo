package com.example.credhubdemo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class VcapService {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Returns the raw VCAP_SERVICES JSON string.
     */
    public String getRawVcapServices() {
        String vcap = System.getenv("VCAP_SERVICES");
        if (vcap == null) {
            return "VCAP_SERVICES is not set (are you running on Cloud Foundry?)";
        }
        try {
            // Pretty-print it
            JsonNode node = mapper.readTree(vcap);
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
        } catch (Exception e) {
            return vcap;
        }
    }

    /**
     * SAFE: Look up credentials by service instance name.
     * This is immune to the CAPI ordering issue in TAS 10.2.4/10.2.5.
     */
    public Map<String, String> getCredentialsByName(String serviceName) {
        Map<String, String> result = new LinkedHashMap<>();
        String vcap = System.getenv("VCAP_SERVICES");
        if (vcap == null) {
            result.put("error", "VCAP_SERVICES not set");
            return result;
        }

        try {
            JsonNode root = mapper.readTree(vcap);
            var serviceTypes = root.fields();
            while (serviceTypes.hasNext()) {
                var serviceType = serviceTypes.next();
                for (JsonNode binding : serviceType.getValue()) {
                    if (serviceName.equals(binding.get("name").asText())) {
                        result.put("lookup_method", "BY NAME (safe)");
                        result.put("service_name", binding.get("name").asText());
                        result.put("label", binding.get("label").asText());
                        JsonNode creds = binding.get("credentials");
                        if (creds != null) {
                            creds.fields().forEachRemaining(entry ->
                                result.put("cred:" + entry.getKey(), entry.getValue().asText())
                            );
                        }
                        return result;
                    }
                }
            }
            result.put("error", "No binding found with name: " + serviceName);
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    /**
     * UNSAFE: Look up credentials by array index.
     * This is vulnerable to the CAPI ordering issue in TAS 10.2.4/10.2.5.
     */
    public Map<String, String> getCredentialsByIndex(String serviceLabel, int index) {
        Map<String, String> result = new LinkedHashMap<>();
        String vcap = System.getenv("VCAP_SERVICES");
        if (vcap == null) {
            result.put("error", "VCAP_SERVICES not set");
            return result;
        }

        try {
            JsonNode root = mapper.readTree(vcap);
            JsonNode serviceArray = root.get(serviceLabel);
            if (serviceArray == null || !serviceArray.isArray()) {
                result.put("error", "No service type found: " + serviceLabel);
                return result;
            }
            if (index >= serviceArray.size()) {
                result.put("error", "Index " + index + " out of bounds (size: " + serviceArray.size() + ")");
                return result;
            }

            JsonNode binding = serviceArray.get(index);
            result.put("lookup_method", "BY INDEX (unsafe - affected by CAPI ordering bug)");
            result.put("array_index", String.valueOf(index));
            result.put("service_name", binding.get("name").asText());
            result.put("label", binding.get("label").asText());
            JsonNode creds = binding.get("credentials");
            if (creds != null) {
                creds.fields().forEachRemaining(entry ->
                    result.put("cred:" + entry.getKey(), entry.getValue().asText())
                );
            }
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }
}
