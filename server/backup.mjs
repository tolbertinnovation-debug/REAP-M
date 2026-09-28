import { DatabaseSync, backup } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
const source = process.env.DB_PATH || "data/market.sqlite";
const destination = process.argv[2];
if (!destination)
  throw new Error(
    "Usage: node server/backup.mjs /secure/path/market-backup.sqlite",
  );
if (!existsSync(source)) throw new Error("The source database does not exist.");
if (resolve(source) === resolve(destination) || existsSync(destination))
  throw new Error("Choose a new backup destination.");
mkdirSync(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source, { readOnly: true });
await backup(db, destination);
db.close();
console.log("Consistent database backup completed.");
