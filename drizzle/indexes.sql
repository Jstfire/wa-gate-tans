-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions_wagate(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions_wagate(token);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles_wagate(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles_wagate(role_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_number ON messages_wagate(from_number);
CREATE INDEX IF NOT EXISTS idx_messages_to_number ON messages_wagate(to_number);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages_wagate(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts_wagate(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_last_message_at ON contacts_wagate(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_blast_jobs_status ON blast_jobs_wagate(status);
CREATE INDEX IF NOT EXISTS idx_blast_jobs_created_by ON blast_jobs_wagate(created_by);
CREATE INDEX IF NOT EXISTS idx_blast_recipients_job_id ON blast_recipients_wagate(job_id);
CREATE INDEX IF NOT EXISTS idx_blast_recipients_status ON blast_recipients_wagate(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys_wagate(key);
CREATE INDEX IF NOT EXISTS idx_chatbot_rules_trigger ON chatbot_rules_wagate(trigger);
CREATE INDEX IF NOT EXISTS idx_wa_templates_category ON wa_templates_wagate(category);
