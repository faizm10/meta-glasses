CREATE TYPE "public"."user_rank" AS ENUM('pa', 'camera_op', 'cinematographer', 'director', 'auteur');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"handle" text,
	"display_name" text,
	"avatar_key" text,
	"rank" "user_rank" DEFAULT 'pa' NOT NULL,
	"premiere_hour" smallint DEFAULT 21 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_idx" ON "users" USING btree ("handle");