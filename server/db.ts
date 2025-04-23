import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import dotenv from 'dotenv';
dotenv.config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mongodb://localhost:27017/quickbite';
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });