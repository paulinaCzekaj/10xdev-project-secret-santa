-- Migration: Setup initial database configuration
-- Description: Sets up initial database configuration and helper functions

-- Create a function to handle updated_at timestamp for our tables
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;

-- Note: auth.users table is managed by Supabase Auth and we don't need to modify it
-- Permissions to auth.users are automatically handled by Supabase Auth
