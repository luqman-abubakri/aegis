# AEGIS Supabase Setup Instructions

This document explains how to set up the Supabase resources required for the AEGIS
Interview Preparation Platform.

## Option A: Fresh Setup (New Project)

If you are setting up a brand-new Supabase project, run the **canonical schema**
file in the Supabase SQL Editor:

```
lib/schema.sql
```

This creates all tables, RLS policies, indexes, the storage bucket, and storage
policies in one shot.

## Option B: Migration (Existing Project)

If you already have a Supabase project with the original schema, run the
**migration** file in the Supabase SQL Editor:

```
supabase/migrations/0001_fix_schema_and_policies.sql
```

This migration is idempotent (safe to run multiple times). It performs the
following changes:

### 1. Add `duration_seconds` column to `interviews`

The application code inserts and reads `duration_seconds`, but the original
schema never included this column. This caused every interview INSERT to fail
with:

```
column 'duration_seconds' of relation 'interviews' does not exist
```

### 2. Add missing INSERT RLS policy on `feedback`

The original schema only had a SELECT policy on the `feedback` table. Without
an INSERT policy, every feedback INSERT was rejected by Row Level Security:

```
new row violates row-level security policy
```

The application silently swallowed this error and reported success, which is
why the dashboard always showed zero data.

### 3. Add missing DELETE/UPDATE RLS policies

- `interviews`: DELETE policy
- `feedback`: UPDATE and DELETE policies
- `resume_uploads`: UPDATE and DELETE policies

Without the DELETE policy on `resume_uploads`, users could not delete their
resumes.

### 4. Create the `resumes` storage bucket

The application uploads PDF resumes to a storage bucket named `resumes`. This
bucket did not exist, causing:

```
Bucket not found
```

### 5. Create storage RLS policies for the `resumes` bucket

File paths follow the pattern `{user_id}/{timestamp}.pdf`, so the first path
segment is the user's UUID. The policies allow users to:

- **Upload** (INSERT) files to their own folder
- **View** (SELECT) their own files
- **Update** (UPDATE) their own files
- **Delete** (DELETE) their own files

## Verifying the Setup

After running the SQL, verify in the Supabase Dashboard:

1. **Table Editor** → `interviews` table → confirm the `duration_seconds` column
   exists.
2. **Authentication** → **Policies** → confirm the `feedback` table has an
   INSERT policy.
3. **Storage** → confirm the `resumes` bucket exists.
4. **Storage** → `resumes` bucket → **Policies** → confirm INSERT, SELECT,
   UPDATE, and DELETE policies exist.

## Manual Bucket Creation (Alternative)

If the SQL for creating the storage bucket does not work (some Supabase versions
restrict `storage.buckets` access), create the bucket manually:

1. Go to the Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Name: `resumes`
4. Public: **No** (private)
5. Click **Create Bucket**

Then run only the storage policy portion of the migration SQL (the
`CREATE POLICY` statements for `storage.objects`).