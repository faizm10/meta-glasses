CREATE TYPE "public"."import_source" AS ENUM('browser_upload', 'photo_library', 'glasses_sync');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('video', 'photo', 'audio');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('registered', 'uploading', 'uploaded', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"status" "media_status" DEFAULT 'registered' NOT NULL,
	"import_source" "import_source" DEFAULT 'browser_upload' NOT NULL,
	"file_name" text,
	"mime" text NOT NULL,
	"bytes" bigint NOT NULL,
	"content_hash" text NOT NULL,
	"captured_at" timestamp with time zone,
	"duration_ms" integer,
	"width" integer,
	"height" integer,
	"fps" real,
	"codec" text,
	"lat" double precision,
	"lng" double precision,
	"original_key" text NOT NULL,
	"proxy_key" text,
	"hls_prefix" text,
	"sprite_key" text,
	"poster_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_user_hash_idx" ON "media" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "media_user_captured_idx" ON "media" USING btree ("user_id","captured_at");