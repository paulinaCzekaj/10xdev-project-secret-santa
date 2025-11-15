#!/bin/bash

# Production Backup Script for Secret Santa
# This script creates a backup of the production Supabase database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Secret Santa Production Backup ===${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Configuration
PROJECT_REF="uiyurwyzsckkkoqthxmv"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Starting backup process...${NC}"
echo "Project: $PROJECT_REF"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is not set.${NC}"
    echo "Get your access token from: https://app.supabase.com/account/tokens"
    echo "Then set it: export SUPABASE_ACCESS_TOKEN=your_token"
    exit 1
fi

# Backup 1: Full database schema and data (SQL)
echo -e "${YELLOW}[1/3] Backing up database schema and data...${NC}"
SQL_FILE="$BACKUP_DIR/production_backup_${TIMESTAMP}.sql"

# Use db-url method with Supabase pooler connection
DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Try multiple methods to get the backup
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
    # Method 1: Direct pg_dump with password
    echo "Using pg_dump with connection string..."
    if PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -U "postgres.${PROJECT_REF}" -d postgres --no-owner --no-acl > "$SQL_FILE" 2>/dev/null; then
        SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
        echo -e "${GREEN}✓ Schema backup completed: $SQL_FILE ($SQL_SIZE)${NC}"
    else
        echo -e "${YELLOW}pg_dump failed, trying Supabase CLI...${NC}"
        # Method 2: Try supabase db dump with db-url
        if supabase db dump --db-url "$DB_URL" > "$SQL_FILE" 2>/dev/null; then
            SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
            echo -e "${GREEN}✓ Schema backup completed: $SQL_FILE ($SQL_SIZE)${NC}"
        else
            echo -e "${RED}✗ Schema backup failed${NC}"
            echo -e "${YELLOW}Hint: Make sure SUPABASE_DB_PASSWORD is set${NC}"
            rm -f "$SQL_FILE"
            exit 1
        fi
    fi
else
    echo -e "${RED}Error: SUPABASE_DB_PASSWORD is not set${NC}"
    echo "Get your database password from: https://app.supabase.com/project/${PROJECT_REF}/settings/database"
    echo "Then set it: export SUPABASE_DB_PASSWORD=your_password"
    rm -f "$SQL_FILE"
    exit 1
fi

# Backup 2: Data only (JSON format for easy inspection)
echo -e "${YELLOW}[2/3] Backing up data in JSON format...${NC}"
JSON_FILE="$BACKUP_DIR/production_data_backup_${TIMESTAMP}.json"

# Use supabase CLI to export data as JSON
# Note: This requires manual data extraction via Supabase API
# For now, we'll create a placeholder that can be extended
cat > "$JSON_FILE" << 'EOF'
{
  "note": "To create JSON backup, use Supabase API or dashboard export",
  "timestamp": "TIMESTAMP_PLACEHOLDER",
  "instructions": "Consider using: supabase db dump --data-only --use-copy --project-ref PROJECT_REF"
}
EOF

# Replace timestamp placeholder
sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -Iseconds)/" "$JSON_FILE"
echo -e "${GREEN}✓ Data backup template created: $JSON_FILE${NC}"

# Backup 3: Create summary file
echo -e "${YELLOW}[3/3] Creating backup summary...${NC}"
SUMMARY_FILE="$BACKUP_DIR/backup_summary_${TIMESTAMP}.json"

cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "project_ref": "$PROJECT_REF",
  "backup_files": {
    "sql": "production_backup_${TIMESTAMP}.sql",
    "json": "production_data_backup_${TIMESTAMP}.json"
  },
  "sql_size": "$SQL_SIZE",
  "tables_backed_up": [
    "profiles",
    "groups",
    "participants",
    "exclusion_rules",
    "assignments",
    "wishlists",
    "result_views"
  ]
}
EOF

echo -e "${GREEN}✓ Summary created: $SUMMARY_FILE${NC}"
echo ""

# Display results
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo ""
echo "Backup files created:"
echo "  1. SQL backup:  $SQL_FILE"
echo "  2. JSON backup: $JSON_FILE"
echo "  3. Summary:     $SUMMARY_FILE"
echo ""
echo -e "${YELLOW}Recommendation:${NC}"
echo "  - Test restore in a development environment"
echo "  - Store backups in a secure location (e.g., encrypted cloud storage)"
echo "  - Keep at least 3 recent backups"
echo ""

# Optional: Clean up old backups (keep last 5)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/production_backup_*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}Cleaning up old backups (keeping last 5)...${NC}"
    cd "$BACKUP_DIR"
    ls -t production_backup_*.sql | tail -n +6 | xargs -r rm
    ls -t production_data_backup_*.json | tail -n +6 | xargs -r rm
    ls -t backup_summary_*.json | tail -n +6 | xargs -r rm
    echo -e "${GREEN}✓ Old backups removed${NC}"
    cd ..
fi

echo -e "${GREEN}Done!${NC}"
