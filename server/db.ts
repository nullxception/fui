import { Database } from "bun:sqlite";
import path from "path";
import { ROOT_DIR } from "./dirs";

const DB_PATH = path.join(ROOT_DIR, "db.sqlite");
export const db = new Database(DB_PATH);

db.run(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    startedAt INTEGER,
    completedAt INTEGER,
    result TEXT
  )
`);

export default db;
