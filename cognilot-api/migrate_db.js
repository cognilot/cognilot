import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.qenhullzuvpjxdyhtudq:GkN03jR45uKA5BA0@aws-1-us-east-1.pooler.supabase.com:6543/postgres');

async function migrate() {
  console.log('Starting migration...');
  
  try {
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;`;
    console.log('Added updated_at to users.');

    await sql`CREATE TABLE IF NOT EXISTS "aliases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "label" text NOT NULL,
        "value" text NOT NULL,
        "category" text DEFAULT 'general',
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`;
    console.log('Created aliases table.');

    await sql`CREATE TABLE IF NOT EXISTS "usage_credits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "credits_used" integer DEFAULT 0 NOT NULL,
        "date" text NOT NULL
    );`;
    console.log('Created usage_credits table.');

    await sql`CREATE TABLE IF NOT EXISTS "user_profiles" (
        "user_id" uuid PRIMARY KEY NOT NULL,
        "data_learned" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "cv_raw_text" text,
        "onboarding_completed" timestamp with time zone,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`;
    console.log('Created user_profiles table.');

    await sql`
    DO $$ BEGIN
     ALTER TABLE "aliases" ADD CONSTRAINT "aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;`;
    
    await sql`
    DO $$ BEGIN
     ALTER TABLE "usage_credits" ADD CONSTRAINT "usage_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;`;
    
    await sql`
    DO $$ BEGIN
     ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;`;
    console.log('Added foreign key constraints.');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

migrate();
