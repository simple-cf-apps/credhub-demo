const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// =============================================================================
// This mimics how the js-api-test / js-api-prod app reads credentials.
// It uses index-based lookups, which is vulnerable to the CAPI ordering
// issue in TAS 10.2.4/10.2.5.
// =============================================================================

app.get("/", (req, res) => {
  const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");
  const credhubService = vcapServices.credhub || [];

  // This is the problematic pattern — grabbing credentials by array position.
  // The app assumes [0] is always the DB creds and [1] is always the API creds.
  // If CAPI reorders the array, these silently swap.
  const dbCreds = credhubService[0] ? credhubService[0].credentials : null;
  const apiCreds = credhubService[1] ? credhubService[1].credentials : null;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>js-api-test</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 2rem; background: #f5f5f5; color: #333; }
    h1 { color: #1a56db; }
    h2 { color: #374151; margin-top: 2rem; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #ef4444; }
    table { border-collapse: collapse; width: 100%; }
    td, th { text-align: left; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
    th { color: #6b7280; font-weight: 500; width: 200px; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px;
          overflow-x: auto; font-size: 0.85rem; }
    .warning { background: #fee2e2; border: 1px solid #fca5a5; padding: 1rem;
               border-radius: 8px; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>js-api-test (simulated)</h1>

  <div class="warning">
    <strong>This app uses index-based lookups:</strong>
    <code>credhubService[0]</code> and <code>credhubService[1]</code><br>
    This is the pattern affected by the CAPI ordering issue in TAS 10.2.4/10.2.5.
  </div>

  <h2>credhubService[0] — "DB Credentials"</h2>
  <div class="card">
    <table>
      <tr><th>Binding Name</th><td>${credhubService[0] ? credhubService[0].name : "N/A"}</td></tr>
      ${renderCreds(dbCreds)}
    </table>
  </div>

  <h2>credhubService[1] — "API Credentials"</h2>
  <div class="card">
    <table>
      <tr><th>Binding Name</th><td>${credhubService[1] ? credhubService[1].name : "N/A"}</td></tr>
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
  console.log(`credhub-demo-unsafe listening on port ${port}`);
});
