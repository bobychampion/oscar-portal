# Oscar Labs — API Documentation

**Base URL:** `https://hjibnxmhxlqbshitalrs.supabase.co/functions/v1`

All endpoints accept and return `application/json`. All endpoints support CORS.

---

## Authentication

The API uses two authentication models depending on the endpoint:

### 1. API Key (for partner integrations)

Used for the **Results API** (`GET /v1-results`). Generate a key from the Oscar admin portal under **Settings → API Keys**.

Include the key in the `Authorization` header:

```
Authorization: Bearer osc_your_api_key_here
```

### 2. No Auth (public endpoints)

`/apply`, `/test-types`, `/pickup-locations`, `/results-lookup`, and `/order-results-lookup` are publicly accessible — no key required.

---

## Endpoints

### GET /test-types

Returns all active diagnostic test types.

**Auth:** None

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Full Blood Count",
    "category": "Haematology",
    "description": "Measures the different components of blood"
  }
]
```

---

### GET /pickup-locations

Returns all active sample collection points (partner pharmacies and clinics).

**Auth:** None

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "HealthPlus Pharmacy Lekki",
    "address": "12 Admiralty Way",
    "city": "Lagos",
    "state": "Lagos"
  }
]
```

---

### POST /apply

Submits a new patient diagnostic test application. Creates a patient record and returns a tracking number the patient uses to retrieve results later.

**Auth:** None

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | string | Yes | Patient's full name |
| `email` | string | Yes | Patient's email address |
| `phone` | string | Yes | Patient's phone number |
| `date_of_birth` | string | Yes | Format: `YYYY-MM-DD` |
| `gender` | string | Yes | `male`, `female`, or `other` |
| `city` | string | Yes | Patient's city |
| `state` | string | Yes | Patient's state |
| `pickup_location_id` | string (UUID) | Yes | ID from `/pickup-locations` |
| `test_type_ids` | string[] (UUID[]) | Yes | One or more IDs from `/test-types` |
| `wants_dnpl` | boolean | No | Whether the patient wants CareCova pay-later financing. Default: `false` |
| `address` | string | No | Street address |
| `blood_group` | string | No | e.g. `A+`, `O-` |
| `genotype` | string | No | e.g. `AA`, `AS`, `SS` |
| `next_of_kin_name` | string | No | Next of kin full name |
| `next_of_kin_phone` | string | No | Next of kin phone |
| `hmo_provider` | string | No | HMO provider name |
| `hmo_number` | string | No | HMO membership number |
| `notes` | string | No | Additional clinical notes |

**Example request**
```json
{
  "full_name": "Adaeze Okonkwo",
  "email": "adaeze@example.com",
  "phone": "+2348012345678",
  "date_of_birth": "1992-04-15",
  "gender": "female",
  "city": "Lagos",
  "state": "Lagos",
  "pickup_location_id": "a1b2c3d4-...",
  "test_type_ids": ["e5f6a7b8-...", "c9d0e1f2-..."],
  "wants_dnpl": false,
  "blood_group": "O+",
  "genotype": "AA"
}
```

**Response `201`**
```json
{
  "tracking_number": "OSC-2026-4821",
  "id": "uuid"
}
```

**Error responses**

| Status | Meaning |
|--------|---------|
| `400` | Missing required fields |
| `500` | Internal server error |

> A confirmation email is automatically sent to the patient's email address with their tracking number.

---

### POST /results-lookup

Look up diagnostic results by tracking number and date of birth. This is the patient-facing lookup — no API key required.

**Auth:** None

**Request body**
```json
{
  "tracking_number": "OSC-2026-4821",
  "date_of_birth": "1992-04-15"
}
```

**Response `200` — results ready**
```json
{
  "status": "complete",
  "tracking_number": "OSC-2026-4821",
  "patient_name": "Adaeze Okonkwo",
  "date_of_birth": "1992-04-15",
  "gender": "female",
  "collected_at": "2026-05-01T10:30:00Z",
  "pickup_location": "HealthPlus Pharmacy Lekki, Lagos",
  "results": [
    {
      "test_name": "Full Blood Count",
      "category": "Haematology",
      "result_value": "13.5",
      "unit": "g/dL",
      "reference_range": "12.0 – 16.0",
      "interpretation": "normal",
      "notes": null,
      "reported_at": "2026-05-02T14:00:00Z"
    }
  ]
}
```

**Response `200` — results not yet ready**
```json
{
  "status": "processing",
  "tracking_number": "OSC-2026-4821",
  "message": "Your results are not yet available. Please check back later."
}
```

The `status` field can be `pending`, `processing`, `complete`, or `cancelled`.

**Error responses**

| Status | Meaning |
|--------|---------|
| `400` | `tracking_number` or `date_of_birth` missing |
| `404` | No record found for the given tracking number and date of birth |

---

### POST /order-results-lookup

Look up results by order number (for walk-in / lab-registered orders, as opposed to online applications). Verified by the patient's date of birth.

**Auth:** None

**Request body**
```json
{
  "order_number": "OSC-ORD-2026-0012",
  "date_of_birth": "1992-04-15"
}
```

**Response `200` — results ready**
```json
{
  "status": "complete",
  "order_number": "OSC-ORD-2026-0012",
  "patient_name": "Adaeze Okonkwo",
  "date_of_birth": "1992-04-15",
  "gender": "female",
  "collected_at": "2026-05-01T10:30:00Z",
  "results": [
    {
      "test_name": "Lipid Profile",
      "category": "Biochemistry",
      "result_value": "4.2",
      "unit": "mmol/L",
      "reference_range": "0 – 5.2",
      "interpretation": "normal",
      "notes": null,
      "reported_at": "2026-05-02T14:00:00Z"
    }
  ]
}
```

**Response `200` — results not yet ready**
```json
{
  "status": "processing",
  "order_number": "OSC-ORD-2026-0012",
  "message": "Your results are not yet available. Please check back later."
}
```

**Error responses**

| Status | Meaning |
|--------|---------|
| `400` | `order_number` or `date_of_birth` missing |
| `404` | No matching record found |

---

### GET /v1-results/:tracking_number

Fetch a completed result set by tracking number. This is the **partner/integration API** — requires an API key.

**Auth:** API Key (`Authorization: Bearer <key>`)

**URL parameter:** `tracking_number` — e.g. `OSC-2026-4821`

**Example**
```
GET /v1-results/OSC-2026-4821
Authorization: Bearer osc_your_api_key_here
```

**Response `200`**
```json
{
  "tracking_number": "OSC-2026-4821",
  "patient": {
    "full_name": "Adaeze Okonkwo",
    "date_of_birth": "1992-04-15",
    "gender": "female"
  },
  "pickup_location": "HealthPlus Pharmacy Lekki, Lagos",
  "completed_at": "2026-05-02T14:00:00Z",
  "results": [
    {
      "test_name": "Full Blood Count",
      "result_value": "13.5",
      "unit": "g/dL",
      "reference_range": "12.0 – 16.0",
      "interpretation": "normal",
      "notes": null,
      "reported_at": "2026-05-02T14:00:00Z"
    }
  ]
}
```

**Error responses**

| Status | Meaning |
|--------|---------|
| `400` | Tracking number missing or invalid format |
| `401` | Missing or invalid API key |
| `404` | Result not found, or results not yet complete |

> Only applications with `status: complete` are returned. If the application exists but results aren't ready yet, you get a `404` with `{ "error": "Results not yet available", "status": "processing" }`.

---

## Webhooks

Oscar Labs can push result notifications to your server the moment results are marked complete. You register your endpoint from the admin portal under **Settings → Webhooks**.

### Event: `result.complete`

Triggered when an application's status is set to `complete`.

**Payload**
```json
{
  "event": "result.complete",
  "tracking_number": "OSC-2026-4821",
  "patient": {
    "full_name": "Adaeze Okonkwo",
    "date_of_birth": "1992-04-15",
    "gender": "female"
  },
  "pickup_location": "HealthPlus Pharmacy Lekki, Lagos",
  "completed_at": "2026-05-02T14:00:00Z",
  "results": [
    {
      "test_name": "Full Blood Count",
      "result_value": "13.5",
      "unit": "g/dL",
      "reference_range": "12.0 – 16.0",
      "interpretation": "normal",
      "notes": null
    }
  ]
}
```

### Verifying webhook signatures

Every request includes an `X-Oscar-Signature` header. Verify it to confirm the request came from Oscar Labs and was not tampered with.

The signature is `HMAC-SHA256` of the raw JSON body, using your webhook secret.

**Node.js example**
```js
const crypto = require('crypto')

function verifySignature(rawBody, secret, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  )
}

// In your Express handler:
app.post('/webhook/oscar', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-oscar-signature']
  if (!verifySignature(req.body, process.env.OSCAR_WEBHOOK_SECRET, sig)) {
    return res.status(401).send('Invalid signature')
  }
  const payload = JSON.parse(req.body)
  // handle payload...
  res.sendStatus(200)
})
```

**Python example**
```python
import hmac, hashlib

def verify_signature(raw_body: bytes, secret: str, signature_header: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

### Request headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Oscar-Signature` | `sha256=<hmac_hex>` |
| `X-Oscar-Event` | `result.complete` |
| `X-Delivery-Id` | UUID of this delivery attempt |

### Retry policy

If your endpoint returns a non-`2xx` status or times out (10 second limit), the delivery is marked `failed` and retried after **5 minutes**. Failed deliveries are visible in the admin portal under **Settings → Webhooks**.

---

## Interpretation values

The `interpretation` field on any result will always be one of:

| Value | Meaning |
|-------|---------|
| `normal` | Within reference range |
| `abnormal` | Outside reference range, not critical |
| `critical` | Requires immediate clinical attention |

---

## Application status values

| Value | Meaning |
|-------|---------|
| `pending` | Received, awaiting processing |
| `processing` | Sample collected, lab work in progress |
| `complete` | Results entered and published |
| `cancelled` | Application cancelled |

---

## Rate limits

There are currently no published rate limits. Please be reasonable with request frequency. If you expect high volume, contact the Oscar Labs team.

---

## Quick start — fetch a result (curl)

```bash
# 1. Get available tests
curl https://hjibnxmhxlqbshitalrs.supabase.co/functions/v1/test-types

# 2. Get pickup locations
curl https://hjibnxmhxlqbshitalrs.supabase.co/functions/v1/pickup-locations

# 3. Submit an application
curl -X POST https://hjibnxmhxlqbshitalrs.supabase.co/functions/v1/apply \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Adaeze Okonkwo",
    "email": "adaeze@example.com",
    "phone": "+2348012345678",
    "date_of_birth": "1992-04-15",
    "gender": "female",
    "city": "Lagos",
    "state": "Lagos",
    "pickup_location_id": "<uuid>",
    "test_type_ids": ["<uuid>"]
  }'

# 4. Fetch results via partner API
curl https://hjibnxmhxlqbshitalrs.supabase.co/functions/v1/v1-results/OSC-2026-4821 \
  -H "Authorization: Bearer osc_your_api_key_here"
```

---

## Contact

For API key requests, webhook registration, or integration support contact the Oscar Labs team.
