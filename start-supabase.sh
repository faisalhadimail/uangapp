#!/bin/bash
# Start dev server with Supabase database (ignore stale shell DATABASE_URL)
cd /home/z/my-project

# Unset stale env vars that point to old SQLite DB
unset DATABASE_URL
unset DIRECT_URL

# Export from .env file directly
export $(grep -v '^#' .env | xargs)

# Start Next.js dev server
exec bun x next dev -p 3000
