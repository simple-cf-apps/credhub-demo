# CredHub VCAP_SERVICES Demo (Node.js)

Demonstrates **safe (name-based)** vs **unsafe (index-based)** service binding lookups
from `VCAP_SERVICES`, illustrating the TAS 10.2.4/10.2.5 CAPI ordering known issue.

## Prerequisites

- TAS foundation with the **CredHub Service Broker** tile installed
- CF CLI authenticated and targeting your org/space

## Setup

### 1. Create two CredHub service instances with different credentials

```bash
cf create-service credhub default demo-creds-db -c '{
  "db-host": "db.example.com",
  "db-port": "5432",
  "db-name": "orders",
  "db-user": "app_user",
  "db-password": "s3cret-db-pass"
}'

cf create-service credhub default demo-creds-api -c '{
  "api-url": "https://api.payments.example.com",
  "api-key": "pk_test_abc123",
  "api-secret": "sk_test_xyz789"
}'
```

### 2. Push to Cloud Foundry

```bash
cf push
```

No need to `npm install` locally — the nodejs_buildpack handles it on push.

### 3. View the app

Open the app URL in your browser.

## Customizing Service Names

Set environment variables in your manifest or via cf set-env:

```yaml
env:
  CREDHUB_SERVICE_NAME_1: your-db-creds
  CREDHUB_SERVICE_NAME_2: your-api-creds
```

Update the `services:` list in manifest.yml to match.
