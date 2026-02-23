const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// =============================================================================
// This is the safe version of the app. Instead of grabbing credentials by
// array index ([0], [1]), it looks them up by service instance name.
// =============================================================================

// Define which service instance name maps to which role in the app.
// These must match the cf create-service names.
const DB_SERVICE_NAME = process.env.DB_SERVICE_NAME || "demo-creds-db";
const API_SERVICE_NAME = process.env.API_SERVICE_NAME || "demo-creds-api";

/**
 * Find a service binding by its instance name within VCAP_SERVICES.
 * Searches through all service types (credhub, p.mysql, etc.) and returns
 * the first binding whose "name" field matches.
 *
 * Returns null if no match is found.
 */
function findServiceByName(vcapServices, serviceName) {
  for (const serviceType of Object.values(vcapServices)) {
    for (const binding of serviceType) {
      if (binding.name === serviceName) {
        return binding;
      }
    }
  }
  return null;
}

app.get("/", (req, res) => {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");

  // Look up each binding by name — order in the array doesn't matter
  const dbBinding = findServiceByName(vcapServices, DB_SERVICE_NAME);
  const apiBinding = findServiceByName(vcapServices, API_SERVICE_NAME);

  const dbCreds = dbBinding ? dbBinding.credentials : null;
  const apiCreds = apiBinding ? apiBinding.credentials : null;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>js-api-test (safe)</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 2rem; background: #f5f5f5; color: #333; }
    h1 { color: #1a56db; }
    h2 { color: #374151; margin-top: 2rem; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #10b981; }
    table { border-collapse: collapse; width: 100%; }
    td, th { text-align: left; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-weight: 500; width: 200px; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px;
          overflow-x: auto; font-size: 0.85rem; }
    .safe { background: #d1fae5; border: 1px solid #6ee7b7; padding: 1rem;
            border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>js-api-test (safe version)</h1>

  <div class="safe">
    <strong>This app uses name-based lookups:</strong>
    <code>findServiceByName(vcapServices, "${DB_SERVICE_NAME}")</code><br>
    Array ordering does not matter — always gets the correct binding.
  </div>

  <h2>DB Credentials — looked up by name: "${DB_SERVICE_NAME}"</h2>
  <div class="card">
    <table>
      <tr><th>Binding Name</th><td>${dbBinding ? dbBinding.name : "NOT FOUND"}</td></tr>
      ${renderCreds(dbCreds)}
    </table>
  </div>

  <h2>API Credentials — looked up by name: "${API_SERVICE_NAME}"</h2>
  <div class="card">
    <table>
      <tr><th>Binding Name</th><td>${apiBinding ? apiBinding.name : "NOT FOUND"}</td></tr>
      ${renderCreds(apiCreds)}
    </table>
  </div>

  <h2>Raw VCAP_SERVICES</h2>
  <pre>${JSON.stringify(vcapServices, null, 2)}</pre>
</body>
</html>`);
});

function renderCreds(creds) {
  if (!creds) return '<tr><th colspan="2">No credentials found</th></tr>';
  return Object.entries(creds)
    .map(([key, value]) => {
      const display = typeof value === "object" ? JSON.stringify(value) : value;
      return `<tr><th>${key}</th><td>${display}</td></tr>`;
    })
    .join("");
}

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

app.listen(port, () => {
  console.log(`credhub-demo-safe listening on port ${port}`);
});
