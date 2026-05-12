# Heart Disease Prediction Backend API Docs

## Base URL

`http://localhost:5000`

> **Beginner Tip:** You only need to talk to the Node.js server running on port `5000`. The Node.js server will handle talking to the AI model behind the scenes. Never try to call the Python AI server directly from your frontend code. Lab staff ingest CSV files through `/api/lab-portal` with `x-lab-key` (Postman / back-office), not through patient JWT routes.

---

# 🔐 Auth Module

`/api/auth`

> 💡 **How it works:**
> 1. User registers or logs in.
> 2. Backend returns a JWT `token`.
> 3. You must send this token in the header (`Authorization: Bearer <token>`) for almost all other requests.

## AUTH-1 · Register

**POST** `/api/auth/register`

```json
{
  "national_id": "29501010001001",
  "username": "ahmed",
  "email": "ahmed@example.com",
  "password": "SecurePassword123"
}
```

**Rules:**
- `national_id`: Exactly 14 digits.
- `password`: Minimum 6 characters.

**Expected:** `201 Created` + JWT token

# Heart Disease Prediction — Backend API (Frontend Integration)

This document describes the **Node.js API** the frontend must use.  
**Do not call the Python/FastAI service (port `8000`) from the browser** — ML, SHAP, and PDF reports are only reachable through these gateway routes.

**Default base URL (local):** `http://localhost:5000`  
(Production: replace with your deployed API origin.)

---

## 1. Conventions

### 1.1 Authentication (JWT)

Most user-facing write operations and predictions require a **Bearer token** from login/register.

```http
Authorization: Bearer <token>
```

- Token payload includes `userId` (server-side user id / CUID).
- Expiry is configured on the server (`JWT_EXPIRE`, often `30d`).
- **401** if missing, invalid, or expired.

### 1.2 Admin key (hospitals only)

Creating/updating/deleting **hospitals** requires:

```http
x-admin-key: <ADMIN_API_KEY>
```

Value must match `ADMIN_API_KEY` in the backend `.env`. Use only for trusted admin/seed tools — **not** in public frontend builds.

### 1.3 Success response (typical)

```json
{
  "success": true,
  "message": "…",
  "data": { }
}
```

Lists often include pagination:

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 1.4 Error response (typical)

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "clx123...",
    "national_id": "29501010001001",
    "username": "ahmed",
    "email": "ahmed@example.com",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `400` — Duplicate email or national ID:**

```json
{
  "success": false,

  "message": "Human readable message",
  "errors": [ ]
}
```

In **development**, `errors` may include stack traces. In production, `errors` is usually empty.

### 1.5 Validation errors (Zod)

Status **400**:
  "message": "User with this email or national ID already exists"
}
```

## AUTH-2 · Login

**POST** `/api/auth/login`

```json
{
  "username": "ahmed",
  "password": "SecurePassword123"
}
```

**Expected:** `200 OK` + JWT token

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "clx123...",
    "national_id": "29501010001001",
    "username": "ahmed",
    "email": "ahmed@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `401` — Invalid credentials:**

```json
{
  "success": false,

  "error": "Validation failed",
  "details": [
    { "field": "body.email", "message": "…" }
  ]
}
```

### 1.6 Rate limiting

All routes under `/api` are rate-limited (default **300 requests / 15 minutes** per IP). On limit, expect **429** (per `express-rate-limit`).

### 1.7 CORS

Backend uses `cors` with `credentials: true`. Set `CORS_ORIGIN` on the server to your frontend origin in production.

---

## 2. Auth

### `POST /api/auth/register`

**Body (JSON):**

| Field | Type | Rules |
|--------|------|--------|
| `national_id` | string | Exactly **14** digits |
| `username` | string | 2–50 chars |
| `email` | string | Valid email |
| `password` | string | Min **6** chars |

**201 example:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "clx123...",
    "national_id": "29501010001001",
    "username": "ahmed",
    "email": "ahmed@example.com",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `400` — Duplicate email or national ID:**

```json
{
  "success": false,
  "message": "User with this email or national ID already exists"
}
```

## AUTH-2 · Login

**POST** `/api/auth/login`

```json
{
  "username": "ahmed",
  "password": "SecurePassword123"
}
```

**Expected:** `200 OK` + JWT token

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "clx123...",
    "national_id": "29501010001001",
    "username": "ahmed",
    "email": "ahmed@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `401` — Invalid credentials:**

```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

## Quick Reference Table (Auth)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/auth/register` | None | Register a new user |
| 2 | `POST` | `/api/auth/login` | None | Login existing user |

---

# 🧠 Predictions Module

  "message": "Invalid username or password"
}
```

## Quick Reference Table (Auth)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/auth/register` | None | Register a new user |
| 2 | `POST` | `/api/auth/login` | None | Login existing user |

---

# 🧠 Predictions Module

`/api/predictions`

> 💡 **How it works:**
> This is the core of the app. You tell the backend to start a prediction for the logged-in user. The backend looks up their latest lab test, talks to the AI, and returns the risk level. If the risk is High, it generates a SHAP image and a PDF report.

## PRED-1 · Start Prediction

**POST** `/api/predictions/start`

**Headers:** `Authorization: Bearer <token>`
**Body:** `{}` (Empty JSON object)

**Expected:** `201 Created`

    "id": "clx…",
    "national_id": "29501010001001",
    "username": "ahmed",
    "email": "ahmed@example.com",
    "createdAt": "…",
    "updatedAt": "…"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
}
```

Store `token` (e.g. memory + `httpOnly` cookie pattern, or `localStorage` for coursework — know the XSS tradeoff).

---

### `POST /api/auth/login`

**Body (JSON):**

| Field | Type |
|--------|------|
| `username` | string |
| `password` | string |

**200 example:** Same shape as register: `success`, `message`, `data` (user without password), `token`.

**401:** Invalid credentials.

---

## 3. Predictions (gateway — primary ML flow)

All routes require **`Authorization: Bearer <token>`**.

The server picks the **latest lab test** for the logged-in user’s `national_id`, runs the internal AI pipeline, and returns a **`prediction_id`** for follow-up assets.

### `POST /api/predictions/start`

**Body:** optional `{}` (no fields required).

**201 example:**

```json
{
  "success": true,
  "message": "Prediction completed successfully",
  "data": {
    "prediction_id": "uuid-or-cuid",
    "lab_test_id": "cuid-lab-test",
    "decision": "high",
    "probability": 72.5,
    "risk_level": "High Risk",
    "risk_color": "#ef4444",
    "decision_label": "High Heart Disease Risk Detected",

    "lab_test_id": "…",
    "decision": "high",
    "probability": 72.5,
    "risk_level": "…",
    "risk_color": "…",
    "decision_label": "…",
    "show_shap": true,
    "show_report": true,
    "show_hospitals": true
  }
}
```

> **Beginner Tip:** Save the `prediction_id`! You will need it in the next steps to get the images and reports. Also, if `decision` is `low`, the `show_shap`, `show_report`, and `show_hospitals` fields are all `false` (so you do not show the hospital section either).

**Example `201` — Low risk:**

```json
{
  "success": true,
  "message": "Prediction completed successfully",
  "data": {
    "prediction_id": "uuid-or-cuid",
    "lab_test_id": "cuid-lab-test",
    "decision": "low",
    "probability": 18.2,
    "risk_level": "Low Risk",
    "risk_color": "#22c55e",
    "decision_label": "Low Heart Disease Risk",
    "show_shap": false,
    "show_report": false,
    "show_hospitals": false
  }
}
```

**Response `404` — No lab test found:**

```json
{
  "success": false,
  "message": "No lab test found for this user. Upload results via your lab or contact support.",
  "errors": []
}
```

**Response `502` — AI service unavailable or internal error:**

```json
{
  "success": false,
  "message": "internal predict failed: Internal Server Error",
  "errors": []
}
```

## PRED-2 · Get SHAP Image

**GET** `/api/predictions/{id}/shap`

**Headers:** `Authorization: Bearer <token>`

**Expected:** `200 OK` · Raw **PNG** image (`Content-Type: image/png`).
*Note: Fetch this as a Blob in JavaScript to display it in an `<img>` tag.*

**Response `400` — Low Risk (Not Available):**

```json
{
  "success": false,
  "message": "SHAP image is not available for low risk predictions.",
  "errors": []
}
```

**Response `403` / `404` — Not your prediction or missing row:**

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": []
}
```

```json
{
  "success": false,
  "message": "Prediction not found",
  "errors": []
}
```

## PRED-3 · Get Medical Report (PDF)

**GET** `/api/predictions/{id}/report`

**Headers:** `Authorization: Bearer <token>`

**Expected:** `200 OK` · Raw **PDF** file (`Content-Type: application/pdf`).

**Response `400` — Low Risk (Not Available):**

```json
{
  "success": false,
  "message": "Report PDF is not available for low risk predictions.",
  "errors": []
}
```

**Response `403` / `404` — Not your prediction or missing row:**

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": []
}
```

```json
{
  "success": false,
  "message": "Prediction not found",
  "errors": []
}
```

## Quick Reference Table (Predictions)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/predictions/start` | User | Run AI prediction on latest lab test |
| 2 | `GET` | `/api/predictions/{id}/shap` | User | Get SHAP explanation image (PNG) |
| 3 | `GET` | `/api/predictions/{id}/report` | User | Get medical report (PDF) |

---

# 🧪 Lab Tests Module

`/api/labtests`

> 💡 **How it works:**
> Patient-facing lab test data. Users check whether they already have results, optionally upload their own CSV, or wait for a lab to ingest data through `/api/lab-portal`. Predictions always use the **latest** lab test row for the logged-in user's `national_id`.

## LAB-1 · Get My Status

**GET** `/api/labtests/me/status`

**Headers:** `Authorization: Bearer <token>`

**Expected:** `200 OK`

```json
{
  "success": true,
  "data": {
    "national_id": "29501010001001",
    "labTestsCount": 0,
    "hasLabTests": false,
    "recommendation": "labs"
  }
}
```

*If `hasLabTests` is `false`, show the user the "Upload Data" screen or explain that their lab will upload results.*

**Response `401` — Missing or invalid token:**

```json
{
  "success": false,
  "message": "No token provided. Please provide a valid token."
}
```

## LAB-2 · Upload CSV (patient self-upload)

**POST** `/api/labtests/upload-csv`

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Body:** Form data with a file attached to the key `file` or `files`.

**CSV rules (one data row):**
- Required columns: `lab_id`, `national_id`, `lab_code`, `age`, `sex`, `chest_pain_type`, `resting_bp_s`, `cholesterol`, `fasting_blood_sugar`, `resting_ecg`, `max_heart_rate`, `exercise_angina`, `oldpeak`, `st_slope`
- `national_id` must be exactly 14 digits and **must match** the logged-in user
- `lab_code` must belong to **AL Borg Labs** or **AL Mokhtabar** and must match the `lab_id` row in the database

**Expected:** `201 Created`

```json
{
  "success": true,
  "message": "Lab test CSV processed for current user",
  "created": {
    "id": "cuid-lab-test",
    "national_id": "29501010001001",
    "lab_id": "cuid-lab",
    "lab_code": "AL Borg 123",
    "file": { "originalname": "my_test.csv" },
    "data": {
      "id": "cuid-lab-test",
      "lab_id": "cuid-lab",
      "national_id": "29501010001001",
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z",
      "lab": {
        "id": "cuid-lab",
        "name": "AL Borg Labs",
        "lab_code": "AL Borg 123",
        "address": "Cairo, Egypt"
      },
      "features": {
        "age": 55,
        "sex": 1,
        "chest_pain_type": 2,
        "resting_bp_s": 140,
        "cholesterol": 250,
        "fasting_blood_sugar": 0,
        "resting_ecg": 1,
        "max_heart_rate": 150,
        "exercise_angina": 0,
        "oldpeak": 1.5,
        "st_slope": 1
      }
    }
  }
}
```

**Response `400` — CSV validation (examples):**

```json
{
  "success": false,
  "message": "CSV national_id must match the logged-in user. Lab uploads use POST /api/lab-portal/upload-csv with x-lab-key (no patient JWT)."
}
```

```json
{
  "success": false,
  "message": "CSV file is required (form-data key: file)"
}
```

## LAB-3 · Create Lab Test (JSON)

**POST** `/api/labtests`

**Headers:** `Authorization: Bearer <token>`

```json
{
  "lab_id": "cuid-lab",

For **low** risk, `show_shap`, `show_report`, and `show_hospitals` are typically **`false`** — UI can hide those sections.

**404:** No lab test exists for this user’s national ID.

**502 / 5xx:** AI service or internal error — show a generic error; details may be in `message`.

---

### `GET /api/predictions/:id/shap`

- **`:id`** = `prediction_id` from `POST /api/predictions/start`.
- **Response:** raw **PNG** (`Content-Type: image/png`).
- **403:** Prediction belongs to another user.
- **404:** Prediction not found.

---

### `GET /api/predictions/:id/report`

- **`:id`** = `prediction_id`.
- **Response:** **PDF** download (`Content-Type: application/pdf`).
- **403 / 404:** Same as SHAP.

---

## 4. Lab tests

### `POST /api/labtests`

**Auth:** required.

**Body (JSON):**

```json
{
  "lab_id": "<lab CUID>",
  "national_id": "29501010001001",
  "features": {
    "age": 55,
    "sex": 1,
    "chest_pain_type": 2,
    "resting_bp_s": 140,
    "cholesterol": 250,
    "fasting_blood_sugar": 0,
    "resting_ecg": 1,
    "max_heart_rate": 150,
    "exercise_angina": 0,
    "oldpeak": 1.5,
    "st_slope": 1
  }
}
```

**Expected:** `201 Created`


Feature constraints match Zod in `validators/labtest.schema.js` (ranges for age, BP, cholesterol, etc.).

**201:** `{ "success": true, "data": { …, "features": { … }, "lab": { … } } }`

---

### `POST /api/labtests/upload-csv`

**Auth:** required.

**Content-Type:** `multipart/form-data`

| Field | Type | Notes |
|--------|------|--------|
| `file` | file | One `.csv` (preferred key) |
| `files` | file | Alternative single file key |

CSV must contain **one data row** with columns including:  
`lab_id`, `national_id`, `lab_code`, and all feature columns (see bulk upload comment in backend).  
**`national_id` in the CSV must match** the logged-in user’s national ID.

**201 example:**

```json
{
  "success": true,
  "message": "Lab test CSV processed for current user",
  "created": {
    "id": "…",
    "national_id": "…",
    "lab_id": "…",
    "lab_code": "…",
    "file": { "originalname": "…" },
    "data": { … }
  }
}
```

---

### `POST /api/labtests/upload-csvs`

**Auth:** required.

**multipart/form-data:** field **`files`**, **1–5** CSV files (max 10 MB each).

Each file = one row, one patient. Used for batch/admin workflows.

**201:** `created`, `failures`, `createdCount`, etc.

---

### `GET /api/labtests`

**Auth:** not required (public list).

**Query:** `page`, `limit` (defaults: page 1, limit 10, max 100).

---

### `GET /api/labtests/me/status`

**Auth:** required.

**200 example:**

```json
{
  "success": true,
  "data": {
    "id": "cuid-lab-test",
    "lab_id": "cuid-lab",
    "national_id": "29501010001001",
    "createdAt": "2026-05-12T10:00:00.000Z",
    "updatedAt": "2026-05-12T10:00:00.000Z",
    "lab": {
      "id": "cuid-lab",
      "name": "AL Borg Labs",
      "lab_code": "AL Borg 123",
      "address": "Cairo, Egypt"
    },
    "features": {
      "age": 55,
      "sex": 1,
      "chest_pain_type": 2,
      "resting_bp_s": 140,
      "cholesterol": 250,
      "fasting_blood_sugar": 0,
      "resting_ecg": 1,
      "max_heart_rate": 150,
      "exercise_angina": 0,
      "oldpeak": 1.5,
      "st_slope": 1
    }

    "national_id": "29501010001001",
    "labTestsCount": 1,
    "hasLabTests": true,
    "recommendation": "labtests"

  }
}
```

## Quick Reference Table (Lab Tests)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `GET` | `/api/labtests/me/status` | User | Check if logged-in user has data |
| 2 | `POST` | `/api/labtests/upload-csv` | User | Patient uploads own CSV (`national_id` must match JWT user) |
| 3 | `POST` | `/api/labtests` | User | Create lab test manually via JSON |
| 4 | `GET` | `/api/labtests` | None | Get all lab tests (paginated) |
| 5 | `GET` | `/api/labtests/patient/{national_id}` | None | Get all tests for a patient |
| 6 | `GET` | `/api/labtests/patient/{national_id}/latest` | None | Get latest test for a patient |
| 7 | `GET` | `/api/labtests/patient/{national_id}/status` | None | Count tests + frontend recommendation |
| 8 | `GET` | `/api/labtests/lab/{lab_id}` | None | Get tests uploaded for a lab |
| 9 | `GET` | `/api/labtests/{id}` | None | Get a single lab test by ID |
| 10 | `PUT` | `/api/labtests/{id}` | User | Update a lab test |
| 11 | `DELETE` | `/api/labtests/{id}` | User | Delete a lab test |

---

# 🧫 Lab Portal Module (staff / Postman)

`/api/lab-portal`

> 💡 **How it works:**
> Lab CSV ingest is **separate** from patient JWT flows. Send `x-lab-key` only (`LAB_API_KEY` in Backend `.env`; falls back to `ADMIN_API_KEY`). Do **not** send `Authorization: Bearer`. The `national_id` inside each CSV is the patient (for example Omar's file while someone else is logged in on another screen).

## LP-1 · Upload Single Patient CSV

**POST** `/api/lab-portal/upload-csv`

**Headers:** `x-lab-key: <LAB_API_KEY>`
**Content-Type:** `multipart/form-data`

**Body:** Form data key `file` (or `files`) with one CSV containing one data row.

**CSV rules:** Same columns and lab-code rules as **LAB-2**, but `national_id` is **any registered patient** (no JWT match).

**Expected:** `201 Created`

```json
{
  "success": true,
  "message": "Lab test CSV processed",
  "created": {
    "id": "cuid-lab-test",
    "national_id": "30203024567891",
    "lab_id": "cuid-lab",
    "lab_code": "AL Borg 123",
    "file": { "originalname": "omar.csv" },
    "data": {
      "id": "cuid-lab-test",
      "lab_id": "cuid-lab",
      "national_id": "30203024567891",
      "createdAt": "2026-05-12T10:00:00.000Z",
      "updatedAt": "2026-05-12T10:00:00.000Z",
      "lab": {
        "id": "cuid-lab",
        "name": "AL Borg Labs",
        "lab_code": "AL Borg 123",
        "address": "Cairo, Egypt"
      },
      "features": {
        "age": 52,
        "sex": 1,
        "chest_pain_type": 3,
        "resting_bp_s": 130,
        "cholesterol": 240,
        "fasting_blood_sugar": 0,
        "resting_ecg": 0,
        "max_heart_rate": 155,
        "exercise_angina": 1,
        "oldpeak": 2.0,
        "st_slope": 2
      }
    }
  }
}
```

**Response `400` — Missing file or invalid CSV:**

```json
{
  "success": false,
  "message": "CSV file is required (form-data key: file)"
}
```

```json
{
  "success": false,
  "message": "Missing/invalid column: cholesterol"
}
```

**Response `403` — Missing or wrong lab key:**

```json
{
  "success": false,
  "message": "Forbidden: lab ingest key is required"
}
```

## LP-2 · Upload 1–5 Patient CSVs (bulk)

**POST** `/api/lab-portal/upload-csvs`

**Headers:** `x-lab-key: <LAB_API_KEY>`
**Content-Type:** `multipart/form-data`

**Body:** Form data key `files` (attach 1 to 5 CSV files; one patient per file; unique `national_id` per request).

**Expected:** `201 Created` when at least one file succeeds

```json
{
  "success": true,
  "message": "Lab test CSV files processed",
  "createdCount": 2,
  "failuresCount": 1,
  "created": [
    {
      "id": "cuid-lab-test-1",
      "national_id": "30105012345678",
      "lab_id": "cuid-lab",
      "lab_code": "AL Borg 123",
      "file": { "originalname": "youssef.csv" },
      "data": { "id": "cuid-lab-test-1", "features": { "age": 48 } }
    },
    {
      "id": "cuid-lab-test-2",
      "national_id": "30203024567891",
      "lab_id": "cuid-lab",
      "lab_code": "AL Borg 123",
      "file": { "originalname": "omar.csv" },
      "data": { "id": "cuid-lab-test-2", "features": { "age": 52 } }
    }
  ],
  "failures": [
    {
      "file": "bad.csv",
      "error": "lab_code must belong to AL Borg Labs or AL Mokhtabar labs only"
    }
  ]
}
```

**Response `400` — No files or none created:**

```json
{
  "success": false,
  "message": "Upload between 1 and 5 CSV files (form-data key: files)"
}
```

```json
{
  "success": false,
  "message": "No lab tests created from uploaded CSV files",
  "failures": [
    {
      "file": "samar.csv",
      "error": "lab_id does not exist"
    }
  ]
}
```

## Quick Reference Table (Lab Portal)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/lab-portal/upload-csv` | `x-lab-key` | Ingest one patient CSV |
| 2 | `POST` | `/api/lab-portal/upload-csvs` | `x-lab-key` | Ingest 1–5 patient CSVs in one request |

---

# 🏥 Hospitals Module

`/api/hospitals`

> 💡 **How it works:**
> If the prediction result is High Risk, you should fetch a list of hospitals to recommend to the user.

## HOSP-1 · Get All Hospitals

**GET** `/api/hospitals?page=1&limit=10`

**Expected:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid-hospital",
      "name": "Dar Al Fouad Hospital",
      "area": "Nasr City",
      "google_maps_link": "https://maps.google.com/..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## HOSP-2 · Get Hospitals by Area

**GET** `/api/hospitals/area/{{area}}`

*Case-insensitive match on the area name.*
*{{area}}= Alexandria , Egypt.*
**Expected:** `200 OK`
```json
{
    "success": true,
    "data": [
        {
            "id": "cmozv054j000098c7imik3jx6",
            "name": "Alexandria International Hospital",
            "area": "Alexandria , Egypt",
            "google_maps_link": "https://maps.app.goo.gl/uXpXhGz8QzX9QZ9z9",
            "createdAt": "2026-05-10T14:19:37.075Z",
            "updatedAt": "2026-05-10T14:19:37.075Z"
        },
        {
            "id": "cmozv054k000398c7bx9rp1fp",
            "name": "Andalusia Hospitals\r\n",
            "area": "Alexandria , Egypt",
            "google_maps_link": "https://maps.app.goo.gl/uXpXhGz8QzX9QZ9z9",
            "createdAt": "2026-05-10T14:19:37.075Z",
            "updatedAt": "2026-05-10T14:19:37.075Z"
        },
        {
            "id": "cmozv054k000198c7n4uxoir2",
            "name": "Elite Hospital\r\n",
            "area": "Alexandria , Egypt",
            "google_maps_link": "https://maps.app.goo.gl/uXpXhGz8QzX9QZ9z9",
            "createdAt": "2026-05-10T14:19:37.075Z",
            "updatedAt": "2026-05-10T14:19:37.075Z"
        }
    ]
}
```
*Also exist 3 Hospitals in {{area}} = Cairo , Egypt.*

## HOSP-3 · Create Hospital (Admin Only)

**POST** `/api/hospitals`

**Headers:** 
- `Authorization: Bearer <token>`
- `x-admin-key: <ADMIN_API_KEY>`

```json
{
  "name": "Cleopatra Hospital",
  "area": "Heliopolis",
  "google_maps_link": "https://maps.google.com/..."
}
```

**Expected:** `201 Created`

## Quick Reference Table (Hospitals)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `GET` | `/api/hospitals` | None | Get all hospitals |
| 2 | `GET` | `/api/hospitals/area/{area}` | None | Search hospitals by city/area |
| 3 | `GET` | `/api/hospitals/{id}` | None | Get hospital by ID |
| 4 | `POST` | `/api/hospitals` | Admin Key | Create a new hospital |
| 5 | `PUT` | `/api/hospitals/{id}` | Admin Key | Update a hospital |
| 6 | `DELETE` | `/api/hospitals/{id}` | Admin Key | Delete a hospital |

---

# 🔬 Labs Info Module

`/api/labs`

> 💡 **How it works:**
> This module manages the physical laboratories where tests are taken.

## LABINFO-1 · Get All Labs

**GET** `/api/labs`

**Expected:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid-lab",
      "name": "Al Mokhtabar",
      "lab_code": "LAB-001",
      "address": "Cairo, Egypt"
    }
  ]
}
```

## Quick Reference Table (Labs Info)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `GET` | `/api/labs` | None | Get all labs |
| 2 | `GET` | `/api/labs/{id}` | None | Get lab by ID |
| 3 | `POST` | `/api/labs` | User | Create a new lab |
| 4 | `PUT` | `/api/labs/{id}` | User | Update a lab |
| 5 | `DELETE` | `/api/labs/{id}` | User | Delete a lab |

---

# 👤 Users Module

`/api/users`

> 💡 **How it works:**
> Standard CRUD operations for managing users in the system.

## USER-1 · Get All Users

**GET** `/api/users`

**Headers:** `Authorization: Bearer <token>`

**Expected:** `200 OK`

## Quick Reference Table (Users)

| # | Method | Endpoint | Auth | Description |
| --- | --- | --- | --- | --- |
| 1 | `GET` | `/api/users` | User | Get all users |
| 2 | `GET` | `/api/users/{id}` | User | Get user by ID |
| 3 | `POST` | `/api/users` | User | Create a new user |
| 4 | `PUT` | `/api/users/{id}` | User | Update a user |
| 5 | `DELETE` | `/api/users/{id}` | User | Delete a user |

---

# ✅ Recommended Execution Order (Frontend Flow)

1. **Auth — Register or Login:** Get the JWT `token` and store it securely.
2. **Lab Tests — Check Status:** Call `GET /api/labtests/me/status`.
   - If `hasLabTests` is `false`, show the Upload Data screen **or** tell the user their lab will upload results.
3. **Lab Tests — Upload Data (patient path):** Call `POST /api/labtests/upload-csv` only when the patient uploads for themselves (`national_id` in CSV = logged-in user).
   - **Lab staff (Postman):** use `POST /api/lab-portal/upload-csv` or `POST /api/lab-portal/upload-csvs` with `x-lab-key` only — no patient `Authorization` header.
4. **Predictions — Start:** Call `POST /api/predictions/start` with the patient's JWT.
   - Backend uses the **latest** lab test for that user's `national_id`.
   - Save the `prediction_id`.
   - Check the `decision` (`high` or `low`).
5. **Display Results:**
   - If `decision` is **low**: Show a reassuring message. Do **not** fetch SHAP or reports.
   - If `decision` is **high**:
     - Call `GET /api/predictions/{id}/shap` and display the image.
     - Call `GET /api/predictions/{id}/report` and provide a download button.
     - Call `GET /api/hospitals` and display nearby hospitals.

---

# 🛡️ Security Checklist for Frontend

| Feature | Status | Implementation |
| --- | --- | --- |
| **Admin Keys** | ⚠️ | Never expose `ADMIN_API_KEY`, `LAB_API_KEY`, or `INTERNAL_API_KEY` in frontend code. |
| **Lab Portal** | ⚠️ | `x-lab-key` is for lab/Postman ingest only. Do not embed it in the patient web app. |
| **AI Service** | ⚠️ | Never call `http://127.0.0.1:8000` (FastAPI) directly from the client. |
| **HTTPS** | ✅ | Send JWT only over HTTPS in production. |
| **Data Privacy** | ✅ | Treat `prediction_id` as sensitive; always use with the user’s own session. |

| **Error Handling**| ✅ | Handle `400` / `403` / `404` / `502` responses (for example low-risk SHAP/report, wrong lab key, missing lab test, AI gateway failure). |
=======
If `hasLabTests` is `false`, `recommendation` is `"labs"` — UI can prompt user to pick a lab / upload flow.

---

### `GET /api/labtests/patient/:national_id`

All lab tests for a national ID (newest ordering in list implementation).

---

### `GET /api/labtests/patient/:national_id/latest`

Latest single lab test or **404**.

---

### `GET /api/labtests/patient/:national_id/status`

Count / `hasLabTests` for that national ID (no auth).

---

### `GET /api/labtests/lab/:lab_id`

All tests for a given lab.

---

### `GET /api/labtests/:id`

Single lab test by id.

---

### `PUT /api/labtests/:id` / `DELETE /api/labtests/:id`

**Auth:** required. Body for PUT uses optional `lab_id`, `national_id`, `features` (partial allowed).

---

## 5. Labs

### `POST /api/labs`

**Auth:** required.  
**Body:** `{ "name", "lab_code", "address" }`

### `GET /api/labs`

**Query:** `page`, `limit`.

### `GET /api/labs/:id`

### `PUT /api/labs/:id` / `DELETE /api/labs/:id`

**Auth:** required.

---

## 6. Hospitals

### `GET /api/hospitals`

**Query:** `page`, `limit`.

### `GET /api/hospitals/area/:area`

Case-insensitive **contains** match on `area` (define this path **before** `/:id` on the server).

Example: `GET /api/hospitals/area/Cairo`

### `GET /api/hospitals/:id`

### `POST /api/hospitals`

**Auth:** Bearer **+** `x-admin-key`.

**Body:** `{ "name", "area", "google_maps_link" }` (URL must be valid).

### `PUT /api/hospitals/:id` / `DELETE /api/hospitals/:id`

**Auth:** Bearer **+** `x-admin-key`.

---

## 7. Users (CRUD)

All require **Bearer** token.

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/users` | Same body rules as register (national_id, username, email, password) |
| `GET` | `/api/users` | `page`, `limit` query |
| `GET` | `/api/users/:id` | |
| `PUT` | `/api/users/:id` | Optional username, email, password |
| `DELETE` | `/api/users/:id` | |

---

## 8. Recommended frontend flow

1. **Register** or **Login** → store `token`.
2. **`GET /api/labtests/me/status`** → if no tests, show labs / upload UX.
3. **`POST /api/labtests/upload-csv`** (or create via JSON) so `national_id` matches the user.
4. **`POST /api/predictions/start`** → read `data.prediction_id`, `decision`, `probability`, flags.
5. If `show_shap` / `show_report`:  
   - `GET /api/predictions/<prediction_id>/shap` (show as image)  
   - `GET /api/predictions/<prediction_id>/report` (open/download PDF)
6. If high risk: **`GET /api/hospitals`** or **`GET /api/hospitals/area/<city>`** for nearby hospitals.

---

## 9. Security checklist for frontend

- Never expose **`INTERNAL_API_KEY`** or **`ADMIN_API_KEY`** in frontend code.
- Never call **`http://127.0.0.1:8000`** (FastAPI) from the client for predict/SHAP/report.
- Send JWT only over **HTTPS** in production.
- Treat **`prediction_id`** as sensitive; always use with the user’s own session.

---

## 10. Quick reference

| Area | Base path |
|------|-----------|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Labs | `/api/labs` |
| Lab tests | `/api/labtests` |
| Hospitals | `/api/hospitals` |
| Predictions | `/api/predictions` |

---

*Generated for frontend integration. Backend version aligns with Express routes under `apps/Backend/src/routes/`.*
| **Error Handling**| ✅ | Handle `400` / `403` / `404` / `502` responses (for example low-risk SHAP/report, wrong lab key, missing lab test, AI gateway failure). |
