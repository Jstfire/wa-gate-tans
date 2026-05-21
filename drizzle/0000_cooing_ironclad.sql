CREATE TABLE "api_keys_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"created_by" uuid,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_wagate_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "roles_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"permissions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_wagate_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_wagate_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_roles_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_rules_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" varchar(50) NOT NULL,
	"parent_trigger" varchar(50),
	"response_type" varchar(20) NOT NULL,
	"response_content" text NOT NULL,
	"response_metadata" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officer_numbers_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"position" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "officer_numbers_wagate_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "wa_accounts_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20),
	"name" varchar(255),
	"status" varchar(20) NOT NULL,
	"qr_code" text,
	"session_data" jsonb,
	"last_connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_accounts_wagate_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "wa_templates_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb,
	"category" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"name" varchar(255),
	"profile_pic_url" text,
	"last_message_at" timestamp with time zone,
	"has_chat_history" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_wagate_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "content_files_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"google_drive_id" varchar(255) NOT NULL,
	"google_drive_url" text NOT NULL,
	"category" varchar(100),
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_files_wagate_google_drive_id_unique" UNIQUE("google_drive_id")
);
--> statement-breakpoint
CREATE TABLE "messages_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wa_message_id" varchar(255) NOT NULL,
	"from_number" varchar(20) NOT NULL,
	"to_number" varchar(20) NOT NULL,
	"message_type" varchar(20) NOT NULL,
	"content" text,
	"media_url" text,
	"metadata" jsonb,
	"direction" varchar(10) NOT NULL,
	"status" varchar(20) NOT NULL,
	"is_from_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_wagate_wa_message_id_unique" UNIQUE("wa_message_id")
);
--> statement-breakpoint
CREATE TABLE "blast_jobs_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"template_id" uuid,
	"message_content" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"total_recipients" integer NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blast_recipients_wagate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_roles_wagate" ADD CONSTRAINT "user_roles_wagate_role_id_roles_wagate_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles_wagate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blast_jobs_wagate" ADD CONSTRAINT "blast_jobs_wagate_template_id_wa_templates_wagate_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."wa_templates_wagate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blast_recipients_wagate" ADD CONSTRAINT "blast_recipients_wagate_job_id_blast_jobs_wagate_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."blast_jobs_wagate"("id") ON DELETE cascade ON UPDATE no action;