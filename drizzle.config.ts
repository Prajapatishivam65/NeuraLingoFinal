import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./utils/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_CxGX7oJ3pKgA@ep-gentle-snowflake-a1wyflqa-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  },
});
