// Shared domain entity types. This is the single source of truth the client
// imports instead of reaching into the server's ORM types, so swapping the
// persistence layer (Prisma -> Drizzle) never ripples into the client.
//
// The server's Drizzle schema (`server/src/db/schema.ts`) is authored to stay
// structurally compatible with these shapes.

export type UserRole = "User" | "Admin";

// Wire shape only: the password hash and refresh token never leave the
// server, so they are not part of the shared type.
export interface User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  isOnline: boolean | null;
  role: UserRole | null;
}

export interface ChatMessage {
  id: number;
  createdAt: Date;
  modifiedAt: Date;
  userId: string;
  characterId: string;
  characterName: string;
  content: string;
}
