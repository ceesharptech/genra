# Database Restore & Disaster Recovery Playbook

This document defines the procedure for decrypting and restoring database backups for Genra.

---

## 1. Prerequisites

- PostgreSQL Client utilities installed (`psql` and `pg_dump` v15+).
- GnuPG (`gpg`).
- Decryption passphrase (stored in project password manager / `BACKUP_ENCRYPTION_KEY`).
- Target Supabase PostgreSQL direct URI:
  ```bash
  postgresql://postgres:[YOUR-DB-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
  ```

---

## 2. Decrypting the Backup Artifact

1. Download the artifact `db-backup-YYYYMMDD_HHMMSS.gpg` from the GitHub Actions **Scheduled Database Backup** run.
2. In your secure terminal, decrypt the file using `gpg`:
   ```bash
   gpg --decrypt --batch --passphrase "$BACKUP_ENCRYPTION_KEY" -o restore.sql db-backup-YYYYMMDD_HHMMSS.gpg
   ```
3. Inspect the first few lines of the decrypted SQL to verify schema definitions:
   ```bash
   head -n 25 restore.sql
   ```

---

## 3. Rehearsal / Restore into Development Project

> [!WARNING]
> Restoring a full dump will drop existing tables and replace table contents. Always verify you are targeting the intended database before executing.

1. Test connection to the target database:
   ```bash
   psql "$TARGET_DB_URL" -c "SELECT current_database(), current_user;"
   ```
2. Execute the restore SQL:
   ```bash
   psql "$TARGET_DB_URL" -f restore.sql
   ```
3. Inspect database status and row counts:
   ```sql
   SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
   FROM (
     SELECT table_name,
            query_to_xml(format('SELECT count(*) AS cnt FROM %I', table_name), false, true, '') AS xml_count
     FROM information_schema.tables
     WHERE table_schema = 'public'
   ) t;
   ```

---

## 4. Post-Restore Verification Checklist

After restoring data:

- [ ] Verify core tables contain expected records:
  - `profiles`
  - `creations`
  - `tools`
  - `tags`
  - `prompts`
  - `resources`
  - `collections`
- [ ] Confirm Row Level Security (RLS) is active on every table:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  ```
- [ ] Test public unauthenticated read queries via anonymous client:
  ```bash
  curl -s -f "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tools?select=id,name&limit=5" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ```
- [ ] Ensure `restore.sql` is shredded/deleted from local machine once verification passes:
  ```bash
  rm -P restore.sql   # macOS
  shred -u restore.sql # Linux
  ```
