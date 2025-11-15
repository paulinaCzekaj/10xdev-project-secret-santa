#!/bin/bash
# Script to apply RLS migration to local Supabase database
# Run this script on your local machine with: bash apply-migration.sh

set -e  # Exit on error

echo "🚀 Applying RLS migration to localhost Supabase..."
echo ""

# Check if Supabase is running
if ! nc -z localhost 54322 2>/dev/null; then
    echo "❌ Error: Supabase is not running on localhost:54322"
    echo ""
    echo "Please start Supabase first:"
    echo "  supabase start"
    echo ""
    exit 1
fi

echo "✅ Supabase is running"
echo ""

# Apply the migration
MIGRATION_FILE="supabase/migrations/20251115212701_fix_rls_policies_with_token_access.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📝 Applying migration: $MIGRATION_FILE"
echo ""

# Execute the migration
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Verifying RLS policies..."
    echo ""

    # Verify RLS is enabled
    PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('groups', 'participants', 'exclusion_rules', 'wishes', 'assignments')
        ORDER BY tablename;
    "

    echo ""
    echo "✅ All done! RLS policies are now active."
    echo ""
    echo "You can now test your application:"
    echo "  1. Create a group"
    echo "  2. Add participants"
    echo "  3. Execute draw"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error messages above."
    exit 1
fi
