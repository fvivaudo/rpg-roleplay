import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = Bun.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// postgres-js handles the `?sslmode=require` in the Neon connection string.
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

export { schema };
