# API Documentation - WA Gate BPS Buton Selatan

## Base URL
- **Development**: http://localhost:3000/api
- **Production**: https://wa-gate.buseldata.com/api

## Authentication

### JWT Token
```http
Authorization: Bearer <jwt_token>
```

### API Key
```http
X-API-Key: <api_key>
```

## Endpoints

### Auth

#### POST /auth/login
Login dengan credentials dari database induk.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["admin"]
  }
}
```

#### POST /auth/logout
Logout dan invalidate token.

#### POST /auth/refresh
Refresh JWT token.

### WA Account

#### GET /wa/status
Get WA connection status.

**Response:**
```json
{
  "success": true,
  "status": "connected",
  "phone": "6281234567890",
  "name": "BPS Buton Selatan"
}
```

#### POST /wa/connect
Initiate WA connection (generate QR).

**Response:**
```json
{
  "success": true,
  "qr": "data:image/png;base64,..."
}
```

#### POST /wa/disconnect
Disconnect WA account.

### Templates

#### GET /templates
List all WA templates.

**Query Params:**
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `search`: string
- `category`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Welcome Message",
      "content": "Selamat datang...",
      "variables": ["name"],
      "category": "greeting",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

#### POST /templates
Create new template.

**Request:**
```json
{
  "name": "Template Name",
  "content": "Message content with {{variable}}",
  "variables": ["variable"],
  "category": "info"
}
```

#### PUT /templates/:id
Update template.

#### DELETE /templates/:id
Delete template.

### Chatbot Rules

#### GET /chatbot/rules
List all chatbot rules.

#### POST /chatbot/rules
Create new rule.

**Request:**
```json
{
  "trigger": "1",
  "parent_trigger": null,
  "response_type": "text",
  "response_content": "Menu response",
  "response_metadata": {},
  "order": 1
}
```

#### PUT /chatbot/rules/:id
Update rule.

#### DELETE /chatbot/rules/:id
Delete rule.

### Officer Numbers

#### GET /officers
List officer numbers.

#### POST /officers
Add officer number.

**Request:**
```json
{
  "name": "Officer Name",
  "phone_number": "6281234567890",
  "position": "Admin PST"
}
```

#### PUT /officers/:id
Update officer.

#### DELETE /officers/:id
Delete officer.

### Content Files

#### GET /content
List files.

#### POST /content/upload
Upload file to Google Drive.

**Request:** multipart/form-data
- `file`: File
- `category`: string

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "Document.pdf",
    "google_drive_id": "1ABC...",
    "google_drive_url": "https://drive.google.com/...",
    "file_size": 1024000
  }
}
```

#### DELETE /content/:id
Delete file from Google Drive and DB.

### API Keys

#### GET /api-keys
List API keys.

#### POST /api-keys
Generate new API key.

**Request:**
```json
{
  "name": "External System"
}
```

**Response:**
```json
{
  "success": true,
  "key": "wg_1234567890abcdef",
  "name": "External System"
}
```

#### DELETE /api-keys/:id
Revoke API key.

### Messages

#### GET /messages
List messages (inbox).

**Query Params:**
- `contact`: string (phone number)
- `page`: number
- `limit`: number

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_number": "6281234567890",
      "to_number": "6289876543210",
      "content": "Hello",
      "direction": "inbound",
      "status": "read",
      "created_at": "2026-05-21T04:00:00Z"
    }
  ]
}
```

#### POST /messages/send
Send message.

**Request:**
```json
{
  "to": "6281234567890",
  "message": "Hello from WA Gate"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "uuid"
}
```

#### GET /messages/contacts
List contacts with last message.

### Users & Roles

#### GET /users
List users (from DB induk, READ-ONLY).

#### GET /roles
List roles.

#### POST /roles
Create role.

**Request:**
```json
{
  "name": "Operator",
  "permissions": {
    "wa_connect": true,
    "wa_send": true,
    "wa_blast": false,
    "templates": true,
    "chatbot": false,
    "content": true,
    "api_keys": false,
    "users": false
  }
}
```

#### PUT /roles/:id
Update role.

#### DELETE /roles/:id
Delete role.

#### POST /users/:userId/roles
Assign role to user.

### WA Blast

#### GET /blast/jobs
List blast jobs.

**Query Params:**
- `status`: string
- `page`: number
- `limit`: number

#### POST /blast/jobs
Create blast job. Safety rule: recipients are deduplicated and only numbers with prior chat history (`contacts_wagate.has_chat_history = true`) are accepted. No-history recipients are rejected/omitted to enforce anti-ban policy.

**Request:**
```json
{
  "name": "Blast Campaign 1",
  "template_id": "uuid",
  "message_content": "Custom message",
  "recipients": [
    "6281234567890",
    "6289876543210"
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Blast Campaign 1",
  "status": "draft",
  "total_recipients": 1,
  "accepted_recipients": 1,
  "rejected_recipients": ["6289876543210"]
}
```

**All recipients rejected:**
```json
{
  "error": "No recipients have prior chat history",
  "rejectedRecipients": ["6289876543210"]
}
```

#### GET /blast/jobs/:id
Get blast job detail.

#### POST /blast/jobs/:id/start
Start blast job by changing status from `draft` to `queued`. Production Worker cron (`* * * * *`) processes queued/running jobs asynchronously. The dispatcher sends at most one pending recipient per cron tick and enforces a random 60–90 second guard after the previous sent recipient before sending the next one.

#### POST /blast/jobs/:id/pause
Pause blast job.

#### POST /blast/jobs/:id/resume
Resume blast job.

#### POST /blast/jobs/:id/cancel
Cancel blast job.

#### GET /blast/jobs/:id/recipients
List recipients for job.

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- **Authenticated**: 100 requests per minute
- **API Key**: 60 requests per minute
- **Public**: 20 requests per minute

## WebSocket Events

### /ws/messages
Real-time message updates.

**Events:**
- `message:new` - New message received
- `message:sent` - Message sent successfully
- `message:delivered` - Message delivered
- `message:read` - Message read
- `typing:start` - Contact started typing
- `typing:stop` - Contact stopped typing

### /ws/blast
Real-time blast job updates.

**Events:**
- `blast:started` - Job started
- `blast:progress` - Progress update
- `blast:paused` - Job paused
- `blast:resumed` - Job resumed
- `blast:completed` - Job completed
- `blast:failed` - Job failed
