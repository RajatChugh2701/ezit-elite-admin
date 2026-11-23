import "dotenv/config";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { Pool } from "pg";

const dbPath=resolve(process.env.LEGACY_SQLITE_PATH||"data/ezit.db");
const python=process.env.PYTHON||"python";
const exporter=resolve("scripts/sqlite_export.py");
let records:Record<string,Record<string,unknown>[]>;
try{records=JSON.parse(execFileSync(python,[exporter,dbPath],{encoding:"utf8",maxBuffer:20*1024*1024}))}
catch{console.error(`Could not read ${dbPath}. Set PYTHON and LEGACY_SQLITE_PATH if the old database is elsewhere.`);process.exit(1)}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const tables=["users","audit_events","applications","members","delegates","plans","services","requests","pes","payments","invoices"];
const client=await pool.connect();
try{
 await client.query("BEGIN");
 const existing=await client.query("SELECT count(*)::int count FROM users");
 if(existing.rows[0].count)throw new Error("Target database already has users; refusing to mix datasets.");
 let total=0;
 for(const table of tables){
  for(const row of records[table]||[]){
   const columns=Object.keys(row).filter(k=>k!=="sqlite_sequence"&&!(table==="members"&&k==="activated_at"&&row[k]===""));
   const values=columns.map(k=>{const v=row[k];if((table==="users"&&k==="permissions")||(table==="audit_events"&&k==="details")){try{return JSON.stringify(typeof v==="string"?JSON.parse(v):v)}catch{return "[]"}}return v===undefined||v===""?null:v});
   const placeholders=columns.map((_,i)=>`$${i+1}${(table==="users"&&columns[i]==="permissions")||(table==="audit_events"&&columns[i]==="details")?"::jsonb":""}`);
   await client.query(`INSERT INTO ${table}(${columns.join(",")}) VALUES(${placeholders.join(",")})`,values);total++;
  }
 }
 await client.query("SELECT setval(pg_get_serial_sequence('audit_events','id'),GREATEST(COALESCE((SELECT max(id) FROM audit_events),0),1),true)");
 await client.query("COMMIT");console.log(`Imported ${total} existing accounts and records. Sign in again; old sessions were not copied.`);
}catch(error){await client.query("ROLLBACK");console.error(error instanceof Error?error.message:"Legacy import failed");process.exitCode=1}
finally{client.release();await pool.end()}
