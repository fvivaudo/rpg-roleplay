CREATE TYPE "public"."MapKind" AS ENUM('EXTERIOR', 'BUILDING', 'TRANSPORT', 'LIMBO');--> statement-breakpoint
CREATE TABLE "Character" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"raceId" text NOT NULL,
	"gender" text NOT NULL,
	"sizeClass" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 500 NOT NULL,
	"attributes" jsonb NOT NULL,
	"bio" text
);
--> statement-breakpoint
CREATE TABLE "ForumCategory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ForumPost" (
	"id" serial PRIMARY KEY NOT NULL,
	"threadId" integer NOT NULL,
	"authorId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ForumThread" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoryId" integer NOT NULL,
	"authorId" uuid NOT NULL,
	"title" varchar(140) NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"lastPostAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MapLevelRevision" (
	"id" serial PRIMARY KEY NOT NULL,
	"levelId" uuid NOT NULL,
	"version" integer NOT NULL,
	"editedBy" uuid,
	"data" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MapLevel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapId" uuid NOT NULL,
	"z" integer DEFAULT 0 NOT NULL,
	"name" varchar(80) DEFAULT 'Ground' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" "MapKind" DEFAULT 'EXTERIOR' NOT NULL,
	"createdBy" uuid
);
--> statement-breakpoint
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_ForumThread_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."ForumThread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_categoryId_ForumCategory_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."ForumCategory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MapLevelRevision" ADD CONSTRAINT "MapLevelRevision_levelId_MapLevel_id_fk" FOREIGN KEY ("levelId") REFERENCES "public"."MapLevel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MapLevelRevision" ADD CONSTRAINT "MapLevelRevision_editedBy_User_id_fk" FOREIGN KEY ("editedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MapLevel" ADD CONSTRAINT "MapLevel_mapId_Map_id_fk" FOREIGN KEY ("mapId") REFERENCES "public"."Map"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Map" ADD CONSTRAINT "Map_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;