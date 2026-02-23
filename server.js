const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Service instance names - match your cf create-service names
const SERVICE_NAME_1 = process.env.CREDHUB_SERVICE_NAME_1 || "demo-creds-db";
const SERVICE_NAME_2 = process.env.CREDHUB_SERVICE_NAME_2 || "demo-creds-api";

// ---------------------------------------------------------------------------
// VCAP_SERVICES helpers
// ---------------------------------------------------------------------------

function getVcapServices() {
  const vcap = process.env.VCAP_SERVICES;
  if (!vcap) return null;
  try {
    return JSON.parse(vcap);
  } catch (e) {
    return null;
  }
}

/**
 * SAFE: Look up credentials by service instance name.
 * Immune to the CAPI ordering issue in TAS 10.2.4/10.2.5.
 */
function getCredsByName(serviceName) {
  const vcapServices = getVcapServices();
  if (!vcapServices) return { error: "VCAP_SERVICES not set" };

  for (const serviceType of Object.values(vcapServices)) {
    for (const binding of serviceType) {
      if (binding.name === serviceName) {
        return {
          lookup_method: "BY NAME (safe)",
          service_name: binding.name,
          label: binding.label,
          credentials: binding.credentials,
        };
      }
    }
  }
  return { error: `No binding found with name: ${serviceName}` };
}

/**
 * UNSAFE: Look up credentials by array index.
 * Vulnerable to the CAPI ordering issue in TAS 10.2.4/10.2.5.
 */
function getCredsByIndex(serviceLabel, index) {
  const vcapServices = getVcapServices();
  if (!vcapServices) return { error: "VCAP_SERVICES not set" };

  const credhubService = vcapServices[serviceLabel] || [];
  if (index >= credhubService.length) {
    return { error: `Index ${index} out of bounds (size: ${credhubService.length})` };
  }

  const binding = credhubService[index];
  return {
    lookup_method: "BY INDEX (unsafe - affected by CAPI ordering bug)",
    array_index: index,
    service_name: binding.name,
    label: binding.label,
    credentials: binding.credentials,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/", (req, res) => {
  const vcapServices = getVcapServices();
  const rawVcap = vcapServices
    ? JSON.stringify(vcapServices, null, 2)
    : "VCAP_SERVICES is not set (are you running on Cloud Foundry?)";

  const data = {
    serviceName1: SERVICE_NAME_1,
    serviceName2: SERVICE_NAME_2,
    safeLookup1: getCredsByName(SERVICE_NAME_1),
    safeLookup2: getCredsByName(SERVICE_NAME_2),
    unsafeLookup0: getCredsByIndex("credhub", 0),
    unsafeLookup1: getCredsByIndex("credhub", 1),
    rawVcap: rawVcap,
  };

  res.send(renderPage(data));
});

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderCard(title, result, cssClass) {
  let rows = "";
  if (result.error) {
    rows = `<tr><th>error</th><td>${result.error}</td></tr>`;
  } else {
    rows += `<tr><th>lookup_method</th><td>${result.lookup_method}</td></tr>`;
    if (result.array_index !== undefined) {
      rows += `<tr><th>array_index</th><td>${result.array_index}</td></tr>`;
    }
    rows += `<tr><th>service_name</th><td>${result.service_name}</td></tr>`;
    rows += `<tr><th>label</th><td>${result.label}</td></tr>`;
    if (result.credentials) {
      for (const [key, value] of Object.entries(result.credentials)) {
        const display = typeof value === "object" ? JSON.stringify(value) : value;
        rows += `<tr><th>cred:${key}</th><td>${display}</td></tr>`;
      }
    }
  }

  return `
    <div class="card ${cssClass}">
      <h3>${title}</h3>
      <table>${rows}</table>
    </div>`;
}

function renderPage(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>CredHub VCAP_SERVICES Demo</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 2rem; background: #f5f5f5; color: #333; }
    h1 { color: #1a56db; }
    h2 { color: #374151; margin-top: 2rem; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .safe { border-left: 4px solid #10b981; }
    .unsafe { border-left: 4px solid #ef4444; }
    .badge-safe { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
    .badge-unsafe { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; }
    table { border-collapse: collapse; width: 100%; }
    td, th { text-align: left; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-weight: 500; width: 200px; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
    .note { background: #fffbeb; border: 1px solid #fde68a; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>CredHub VCAP_SERVICES Demo (Node.js)</h1>
  <p>This app demonstrates <strong>safe (name-based)</strong> vs <strong>unsafe (index-based)</strong>
     lookups of service bindings from VCAP_SERVICES.</p>

  <div class="note">
    <strong>TAS 10.2.4/10.2.5 Known Issue:</strong> CAPI changed the ordering of service bindings
    in the VCAP_SERVICES array. Apps using index-based lookups may retrieve the wrong credentials.
  </div>

  <h2><span class="badge-safe">SAFE</span> Lookup by Name</h2>
  ${renderCard("Service: " + data.serviceName1, data.safeLookup1, "safe")}
  ${renderCard("Service: " + data.serviceName2, data.safeLookup2, "safe")}

  <h2><span class="badge-unsafe">UNSAFE</span> Lookup by Index</h2>
  ${renderCard("credhub[0]", data.unsafeLookup0, "unsafe")}
  ${renderCard("credhub[1]", data.unsafeLookup1, "unsafe")}

  <h2>Raw VCAP_SERVICES</h2>
  <pre>${data.rawVcap}</pre>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`credhub-demo listening on port ${port}`);
});
