# CredHub VCAP_SERVICES Demo

Demonstrates **safe (name-based)** vs **unsafe (index-based)** service binding lookups
from `VCAP_SERVICES`, illustrating the TAS 10.2.4/10.2.5 CAPI ordering known issue.

## Prerequisites

- TAS foundation with the **CredHub Service Broker** tile installed
- CF CLI authenticated and targeting your org/space
- Java 17+ and Maven installed locally (for building)

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

### 2. Build the app

```bash
./mvnw clean package -DskipTests
```

### 3. Push to Cloud Foundry

```bash
cf push
```

The manifest will automatically bind both service instances.

### 4. View the app

Open the app URL in your browser. You'll see:

- **Safe lookups** — credentials retrieved by service instance name (always correct)
- **Unsafe lookups** — credentials retrieved by array index (may swap after upgrades)
- **Raw VCAP_SERVICES** — the full JSON for inspection

## Customizing Service Names

If you use different service instance names, update them in either:

- `application.properties`:
  ```properties
  credhub.service-name-1=your-db-creds
  credhub.service-name-2=your-api-creds
  ```

- Or in `manifest.yml` under `services:` and via environment variables:
  ```yaml
  env:
    CREDHUB_SERVICE_NAME_1: your-db-creds
    CREDHUB_SERVICE_NAME_2: your-api-creds
  ```

## What This Demonstrates

The CAPI ordering bug (TAS 10.2.4/10.2.5) can change the position of service
bindings within the `VCAP_SERVICES` array for a given service type. If an app
uses `vcapServices["credhub"][0]` to get credentials, it may silently get the
wrong service's credentials after an upgrade.

The fix is simple: always look up bindings by `name`, not by array index.
