CREATE TYPE "public"."film_kind" AS ENUM('daily', 'weekly', 'monthly', 'yearly', 'supercut');--> statement-breakpoint
CREATE TYPE "public"."film_status" AS ENUM('drafting', 'rendering', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "film_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"film_id" text NOT NULL,
	"parent_version_id" text,
	"label" text DEFAULT 'Cut 1' NOT NULL,
	"timeline" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "films" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "film_kind" DEFAULT 'daily' NOT NULL,
	"status" "film_status" DEFAULT 'drafting' NOT NULL,
	"title" text NOT NULL,
	"logline" text,
	"note" text,
	"chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"covers_date" date NOT NULL,
	"hero_frame_key" text,
	"film_key" text,
	"duration_ms" integer,
	"current_version_id" text,
	"pipeline_ref" text,
	"premiered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "film_versions" ADD CONSTRAINT "film_versions_film_id_films_id_fk" FOREIGN KEY ("film_id") REFERENCES "public"."films"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "films" ADD CONSTRAINT "films_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "films_user_created_idx" ON "films" USING btree ("user_id","created_at");