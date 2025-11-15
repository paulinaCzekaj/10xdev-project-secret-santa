#!/bin/bash

# Production Backup Script using Supabase REST API
# This script exports all data from production using the service_role key

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Secret Santa Production Backup (API Method) ===${NC}"
echo ""

# Configuration
PROJECT_REF="uiyurwyzsckkkoqthxmv"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. JSON output will not be formatted.${NC}"
    echo "Install with: sudo apt install jq"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Read service_role key from .env.production
if [ -f ".env.production" ]; then
    SERVICE_ROLE_KEY=$(grep "^SUPABASE_KEY=" .env.production | cut -d'=' -f2)
fi

# Check if SERVICE_ROLE_KEY is set
if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_KEY not found in .env.production${NC}"
    echo "Make sure your .env.production file contains:"
    echo "SUPABASE_KEY=your_service_role_key"
    exit 1
fi

echo -e "${YELLOW}Starting backup process...${NC}"
echo "Project: $PROJECT_REF"
echo "Timestamp: $TIMESTAMP"
echo "URL: $SUPABASE_URL"
echo ""

# Tables to backup (profiles excluded - it's in auth schema, not accessible via REST API)
TABLES=(
    "groups"
    "participants"
    "exclusion_rules"
    "assignments"
    "wishlists"
    "result_views"
)

# Create main backup file
BACKUP_FILE="$BACKUP_DIR/production_data_backup_${TIMESTAMP}.json"
echo "{" > "$BACKUP_FILE"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$BACKUP_FILE"
echo "  \"project_ref\": \"$PROJECT_REF\"," >> "$BACKUP_FILE"
echo "  \"tables\": {" >> "$BACKUP_FILE"

TOTAL_TABLES=${#TABLES[@]}
CURRENT=0
TOTAL_RECORDS=0

# Backup each table
for TABLE in "${TABLES[@]}"; do
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}[${CURRENT}/${TOTAL_TABLES}] Backing up table: ${TABLE}${NC}"

    # Fetch data from Supabase REST API
    RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/${TABLE}?select=*" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

    # Check if response is valid JSON
    if echo "$RESPONSE" | jq empty 2>/dev/null; then
        RECORD_COUNT=$(echo "$RESPONSE" | jq 'length')
        TOTAL_RECORDS=$((TOTAL_RECORDS + RECORD_COUNT))

        echo "    \"${TABLE}\": ${RESPONSE}" >> "$BACKUP_FILE"

        # Add comma if not last table
        if [ $CURRENT -lt $TOTAL_TABLES ]; then
            echo "," >> "$BACKUP_FILE"
        fi

        echo -e "${GREEN}  ✓ Exported ${RECORD_COUNT} records${NC}"
    else
        echo -e "${RED}  ✗ Failed to fetch data (invalid JSON response)${NC}"
        echo "    \"${TABLE}\": []" >> "$BACKUP_FILE"

        # Add comma if not last table
        if [ $CURRENT -lt $TOTAL_TABLES ]; then
            echo "," >> "$BACKUP_FILE"
        fi
    fi
done

# Close JSON structure
echo "  }" >> "$BACKUP_FILE"
echo "}" >> "$BACKUP_FILE"

# Format JSON if jq is available
if [ "$JQ_AVAILABLE" = true ]; then
    echo -e "${YELLOW}Formatting JSON output...${NC}"
    jq '.' "$BACKUP_FILE" > "${BACKUP_FILE}.tmp" && mv "${BACKUP_FILE}.tmp" "$BACKUP_FILE"
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

# Create summary file
SUMMARY_FILE="$BACKUP_DIR/backup_summary_${TIMESTAMP}.json"
cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "project_ref": "$PROJECT_REF",
  "method": "REST API",
  "backup_files": {
    "json": "production_data_backup_${TIMESTAMP}.json"
  },
  "total_records": $TOTAL_RECORDS,
  "file_size": "$FILE_SIZE",
  "tables": [
$(IFS=','; echo "    \"${TABLES[*]}\"" | sed 's/,/",\n    "/g')
  ]
}
EOF

if [ "$JQ_AVAILABLE" = true ]; then
    jq '.' "$SUMMARY_FILE" > "${SUMMARY_FILE}.tmp" && mv "${SUMMARY_FILE}.tmp" "$SUMMARY_FILE"
fi

echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo ""
echo "Backup files created:"
echo "  1. Data backup: $BACKUP_FILE ($FILE_SIZE)"
echo "  2. Summary:     $SUMMARY_FILE"
echo ""
echo "Total records exported: $TOTAL_RECORDS"
echo ""
echo -e "${YELLOW}Recommendation:${NC}"
echo "  - Test restore in a development environment"
echo "  - Store backups in a secure location"
echo "  - Keep at least 3 recent backups"
echo ""

# Optional: Clean up old backups (keep last 5)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/production_data_backup_*.json 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}Cleaning up old backups (keeping last 5)...${NC}"
    cd "$BACKUP_DIR"
    ls -t production_data_backup_*.json | tail -n +6 | xargs -r rm
    ls -t backup_summary_*.json | tail -n +6 | xargs -r rm
    echo -e "${GREEN}✓ Old backups removed${NC}"
    cd ..
fi

echo -e "${GREEN}Done!${NC}"
