# Rollback Information

Migration: add_teacher_role_and_team
Timestamp: 20260130182537
Applied: 2026-01-30

## Backup Files

- Latest backup: ./backups/pre_migration_20260130_185319.sql
- Previous backup: ./backups/ai_afterschool-2026-01-30_15-24-43.sql.gz

## Rollback Steps

If the migration needs to be rolled back:

1. Stop the application
2. Restore backup:
   ```bash
   docker exec -i supabase_db_krdn-afterschool psql -U postgres ai_afterschool < ./backups/pre_migration_20260130_185319.sql
   ```
3. Mark migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back 20260130182537_add_teacher_role_and_team
   ```
4. Restart the application

## Migration Details

This migration added:
- Role enum (DIRECTOR, TEAM_LEADER, MANAGER, TEACHER)
- Team model with unique name constraint
- Teacher.role and Teacher.teamId fields
- Student.teamId field
- Foreign key constraints with ON DELETE SET NULL
- Indexes on teamId columns

## Note

This migration was completed successfully and all data was preserved. All existing students have teamId = NULL as expected.
