CREATE TYPE "public"."UserRole" AS ENUM('User', 'Admin');--> statement-breakpoint
CREATE TABLE "ChatMessage" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"modifiedAt" timestamp (3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"characterName" text NOT NULL,
	"characterId" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	"name" varchar(60) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"isOnline" boolean DEFAULT false,
	"role" "UserRole" DEFAULT 'User',
	"refreshToken" text,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;