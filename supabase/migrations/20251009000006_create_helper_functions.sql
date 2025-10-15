-- Migration: Create helper functions
-- Description: Creates additional helper functions and triggers for database management

-- Create a function to check if a user is a participant in a group
create or replace function public.is_user_in_group(p_user_id uuid, p_group_id bigint)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.participants 
        where 
            group_id = p_group_id 
            and user_id = p_user_id
    );
end;
$$ language plpgsql security definer;

-- Create a function to check if a user is the creator of a group
create or replace function public.is_group_creator(p_user_id uuid, p_group_id bigint)
returns boolean as $$
begin
    return exists (
        select 1 
        from public.groups 
        where 
            id = p_group_id 
            and creator_id = p_user_id
    );
end;
$$ language plpgsql security definer;

-- Create a function to get all participants in a group
create or replace function public.get_group_participants(p_group_id bigint)
returns table (
    participant_id bigint,
    participant_name text,
    participant_email citext,
    user_id uuid
) as $$
begin
    return query
    select 
        id as participant_id,
        name as participant_name,
        email as participant_email,
        user_id
    from public.participants
    where group_id = p_group_id;
end;
$$ language plpgsql security definer;

comment on function public.is_user_in_group is 'Checks if a user is a participant in a specific group';
comment on function public.is_group_creator is 'Checks if a user is the creator of a specific group';
comment on function public.get_group_participants is 'Returns all participants in a specific group';
