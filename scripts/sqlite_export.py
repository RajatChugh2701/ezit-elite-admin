import json
import sqlite3
import sys

path = sys.argv[1]
db = sqlite3.connect(path)
db.row_factory = sqlite3.Row
tables = {"users":"users","audit":"audit_events","applications":"applications","members":"members","delegates":"delegates","plans":"plans","services":"services","requests":"requests","pes":"pes","payments":"payments","invoices":"invoices"}
known = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
result = {}
for old, new in tables.items():
    if old in known:
        result[new] = [dict(row) for row in db.execute(f'SELECT * FROM "{old}"')]
        if old == "users":
            for row in result[new]:
                row["password_hash"] = row.pop("pass_hash")
                row["permissions"] = json.loads(row["permissions"] or "[]")
print(json.dumps(result, separators=(",", ":")))
