import psycopg2, json
conn = psycopg2.connect('postgresql://postgres:mVorlj59TrcWkOP@spb-7yrcfbi4r0t4bkev.supabase.opentrust.net:5432/postgres')
cur = conn.cursor()
cur.execute('select table_schema, table_name from information_schema.tables where table_type= BASE TABLE order by table_schema, table_name')
rows = cur.fetchall()
schemas = {}
for schema, name in rows:
    schemas.setdefault(schema, []).append(name)
print(json.dumps(schemas, indent=2, ensure_ascii=False))
cur.close()
conn.close()
