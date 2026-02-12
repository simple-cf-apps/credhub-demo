package com.example.credhubdemo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CredhubDemoController {

    private final VcapService vcapService;

    // These names should match the cf create-service instance names
    @Value("${credhub.service-name-1:demo-creds-db}")
    private String serviceName1;

    @Value("${credhub.service-name-2:demo-creds-api}")
    private String serviceName2;

    public CredhubDemoController(VcapService vcapService) {
        this.vcapService = vcapService;
    }

    @GetMapping("/")
    public String index(Model model) {

        // Raw VCAP_SERVICES for reference
        model.addAttribute("rawVcap", vcapService.getRawVcapServices());

        // SAFE: name-based lookups
        model.addAttribute("safeLookup1", vcapService.getCredentialsByName(serviceName1));
        model.addAttribute("safeLookup2", vcapService.getCredentialsByName(serviceName2));
        model.addAttribute("serviceName1", serviceName1);
        model.addAttribute("serviceName2", serviceName2);

        // UNSAFE: index-based lookups (for comparison)
        model.addAttribute("unsafeLookup0", vcapService.getCredentialsByIndex("credhub", 0));
        model.addAttribute("unsafeLookup1", vcapService.getCredentialsByIndex("credhub", 1));

        return "index";
    }
}
