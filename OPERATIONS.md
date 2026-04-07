# Operations Plan

This document provides a minimal production operations plan for the Finance & Chit Fund Management System.

## Daily Database Backup Plan

- Schedule a daily full backup during off-peak hours (example: 02:00 local time).
- Store backups outside the project folder and rotate them (example: keep the last 14 or 30 days).
- Verify each backup file size is greater than 0 bytes and that the command exits with code 0.

Example command (choose the tool available on your system and replace values from backend/.env):

PowerShell:

mysqldump -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> > D:\backups\finance_chit_db_YYYYMMDD.sql

If MariaDB tools are installed instead of MySQL tools:

mariadb-dump -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> > D:\backups\finance_chit_db_YYYYMMDD.sql

Notes:
- Avoid storing the DB password in plain text. Use a credential store or prompt for it at runtime.
- Ensure the backup path is on a volume with enough free space.

## Restore Test Plan

- Create a separate restore database (example: finance_chit_db_restore).
- Restore the most recent backup into the restore database.
- Run a smoke test against the restore DB to confirm integrity.

Example restore command:

mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p finance_chit_db_restore < D:\backups\finance_chit_db_YYYYMMDD.sql

Then run the backend smoke test with DB_NAME=finance_chit_db_restore.

## Error Log Monitoring

- Run the backend as a managed service (PM2, NSSM, or Windows Service).
- Capture stdout and stderr logs to a file with rotation.
- Review error logs daily and set alerts for repeated failures.

## Record Keeping

- Track backup and restore test results in a simple log (date, success/failure, operator).
