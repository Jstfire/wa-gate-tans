# Database Schema - WA Gate BPS Buton Selatan

## Database Connections

### DB Induk (READ-ONLY)
- **Purpose**: User authentication
- **Tables**: users (existing, DO NOT MODIFY)
- **Connection**: DATABASE_URL (pooler)
- **Access**: Read-only queries untuk login

### DB Baru (Read-Write)
- **Purpose**: WA Gate system data
- **Tables**: Semua dengan suffix _wagate
- **Connection**: DATABASE_URL_WAGATE (pooler)
- **Access**: Full CRUD

## Tables Schema

### sessions_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users(id) ON DELETE CASCADE,
  token: text UNIQUE NOT NULL,
  expires_at: timestamp NOT NULL,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### roles_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(100) UNIQUE NOT NULL,
  permissions: jsonb NOT NULL, // { wa_connect, wa_send, wa_blast, templates, chatbot, content, api_keys, users }
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### user_roles_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id: uuid REFERENCES roles_wagate(id) ON DELETE CASCADE,
  created_at: timestamp DEFAULT now(),
  UNIQUE(user_id, role_id)
}
```

### api_keys_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(255) NOT NULL,
  key: varchar(255) UNIQUE NOT NULL,
  created_by: uuid REFERENCES users(id) ON DELETE SET NULL,
  last_used_at: timestamp,
  is_active: boolean DEFAULT true,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### wa_accounts_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  phone_number: varchar(20) UNIQUE,
  name: varchar(255),
  status: varchar(20) NOT NULL, // 'disconnected', 'connecting', 'connected', 'error'
  qr_code: text,
  session_data: jsonb,
  last_connected_at: timestamp,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### wa_templates_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(255) NOT NULL,
  content: text NOT NULL,
  variables: jsonb, // Array of variable names: ["name", "date"]
  category: varchar(100), // 'greeting', 'info', 'notification'
  is_active: boolean DEFAULT true,
  created_by: uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### chatbot_rules_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  trigger: varchar(50) NOT NULL, // Menu number: '1', '2', '3', etc.
  parent_trigger: varchar(50), // Parent menu for sub-menus
  response_type: varchar(20) NOT NULL, // 'text', 'location', 'pdf', 'link', 'admin'
  response_content: text NOT NULL,
  response_metadata: jsonb, // { pdf_id, location_coords, link_url }
  order: integer DEFAULT 0,
  is_active: boolean DEFAULT true,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### officer_numbers_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(255) NOT NULL,
  phone_number: varchar(20) UNIQUE NOT NULL,
  position: varchar(100),
  is_active: boolean DEFAULT true,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### content_files_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(255) NOT NULL,
  original_filename: varchar(255) NOT NULL,
  mime_type: varchar(100) NOT NULL,
  file_size: bigint NOT NULL,
  google_drive_id: varchar(255) UNIQUE NOT NULL,
  google_drive_url: text NOT NULL,
  category: varchar(100), // 'pdf', 'image', 'document'
  uploaded_by: uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### messages_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  wa_message_id: varchar(255) UNIQUE NOT NULL,
  from_number: varchar(20) NOT NULL,
  to_number: varchar(20) NOT NULL,
  message_type: varchar(20) NOT NULL, // 'text', 'image', 'document', 'location'
  content: text,
  media_url: text,
  metadata: jsonb,
  direction: varchar(10) NOT NULL, // 'inbound', 'outbound'
  status: varchar(20) NOT NULL, // 'pending', 'sent', 'delivered', 'read', 'failed'
  is_from_bot: boolean DEFAULT false,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### contacts_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  phone_number: varchar(20) UNIQUE NOT NULL,
  name: varchar(255),
  profile_pic_url: text,
  last_message_at: timestamp,
  has_chat_history: boolean DEFAULT false,
  is_blocked: boolean DEFAULT false,
  metadata: jsonb,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

### blast_jobs_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  name: varchar(255) NOT NULL,
  template_id: uuid REFERENCES wa_templates_wagate(id) ON DELETE SET NULL,
  message_content: text NOT NULL,
  status: varchar(20) NOT NULL, // 'draft', 'queued', 'running', 'paused', 'completed', 'cancelled'
  total_recipients: integer NOT NULL,
  sent_count: integer DEFAULT 0,
  failed_count: integer DEFAULT 0,
  created_by: uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at: timestamp DEFAULT now(),
  started_at: timestamp,
  completed_at: timestamp,
  updated_at: timestamp DEFAULT now()
}
```

### blast_recipients_wagate
```typescript
{
  id: uuid PRIMARY KEY,
  job_id: uuid REFERENCES blast_jobs_wagate(id) ON DELETE CASCADE,
  phone_number: varchar(20) NOT NULL,
  status: varchar(20) NOT NULL, // 'pending', 'sending', 'sent', 'failed'
  sent_at: timestamp,
  error_message: text,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
}
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_sessions_user_id ON sessions_wagate(user_id);
CREATE INDEX idx_sessions_token ON sessions_wagate(token);
CREATE INDEX idx_user_roles_user_id ON user_roles_wagate(user_id);
CREATE INDEX idx_messages_from_number ON messages_wagate(from_number);
CREATE INDEX idx_messages_to_number ON messages_wagate(to_number);
CREATE INDEX idx_messages_created_at ON messages_wagate(created_at DESC);
CREATE INDEX idx_contacts_phone_number ON contacts_wagate(phone_number);
CREATE INDEX idx_blast_recipients_job_id ON blast_recipients_wagate(job_id);
CREATE INDEX idx_blast_recipients_status ON blast_recipients_wagate(status);
```

## Migration Strategy

1. Create all tables in DB Baru
2. Add indexes
3. Seed initial data:
   - Default roles (admin, operator, viewer)
   - Officer numbers dari repo lama
   - Chatbot rules dari repo lama
   - WA templates dari repo lama
