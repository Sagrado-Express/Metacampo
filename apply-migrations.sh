#!/bin/bash

# Apply Supabase migrations
# Supports: Supabase CLI, psql, or manual SQL Editor

set -e

PROJECT_REF="jcnxinvycgluoeqixdul"
MIGRATIONS_DIR="./supabase/migrations"

echo "🚀 Supabase Migration Tool"
echo "========================================"
echo ""

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# List migrations
echo "📦 Found migrations:"
ls -1 "$MIGRATIONS_DIR"/*.sql | sed 's|^|  - |'
echo ""

# Check environment
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  Loading environment from .env.local..."
    set -a
    source .env.local
    set +a
fi

echo "📍 Target Supabase: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Try Supabase CLI first
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI detected"
    echo ""
    echo "Choose an option:"
    echo "  1) Push migrations via Supabase CLI (recommended)"
    echo "  2) Use psql directly"
    echo "  3) Show manual SQL Editor instructions"
    echo ""
    read -p "Enter choice (1-3): " choice

    case $choice in
        1)
            echo ""
            echo "🔗 Linking project..."
            supabase link --project-ref "$PROJECT_REF" 2>/dev/null || {
                echo "⚠️  Could not link project. Trying alternative method..."
                echo ""
                echo "Please run:"
                echo "  supabase link --project-ref $PROJECT_REF"
                echo ""
                exit 1
            }

            echo ""
            echo "📤 Pushing migrations..."
            supabase db push

            echo ""
            echo "✅ Migrations applied!"
            ;;

        2)
            echo ""
            echo "🐘 Using psql to apply migrations..."
            read -sp "Enter postgres password: " DB_PASSWORD
            echo ""

            for migration_file in "$MIGRATIONS_DIR"/*.sql; do
                filename=$(basename "$migration_file")
                echo "Applying $filename..."
                psql "postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres" < "$migration_file" || {
                    echo "❌ Failed to apply $filename"
                    exit 1
                }
            done

            echo ""
            echo "✅ Migrations applied!"
            ;;

        3)
            show_sql_editor_instructions
            ;;

        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
else
    echo "⚠️  Supabase CLI not found. Installing..."
    npm install -g supabase
    echo ""
    echo "Please run this script again:"
    echo "  ./apply-migrations.sh"
fi

# Verify migrations were applied
echo ""
echo "🔍 Verifying migrations..."
echo ""

cat > /tmp/verify.sql << EOF
SELECT tablename FROM pg_tables WHERE tablename LIKE 'tenant_%' OR tablename = 'planejamento_cliente_segmento';
EOF

if command -v psql &> /dev/null; then
    echo "Tables created:"
    psql "postgresql://postgres@db.${PROJECT_REF}.supabase.co:5432/postgres" -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'tenant_%' OR tablename = 'planejamento_cliente_segmento' ORDER BY tablename;"
    echo ""
fi

echo "✅ Done!"

function show_sql_editor_instructions() {
    echo ""
    echo "📖 Manual SQL Editor Instructions"
    echo "=================================="
    echo ""
    echo "1. Open Supabase SQL Editor:"
    echo "   https://app.supabase.com/project/$PROJECT_REF/sql/new"
    echo ""
    echo "2. Copy & run the first migration:"
    cat "$MIGRATIONS_DIR/20260728093600_add_missing_tables.sql"
    echo ""
    echo "3. Copy & run the second migration:"
    cat "$MIGRATIONS_DIR/20260728093700_add_performance_indexes.sql"
    echo ""
    echo "✅ Done!"
}
