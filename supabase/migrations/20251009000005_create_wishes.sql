-- Migration: Create wishes table
-- Description: Creates the wishes table with RLS policies and necessary indexes
-- This table stores wish lists for participants

-- Create wishes table
create table public.wishes (
    id bigserial primary key,
    participant_id bigint not null references public.participants(id) on delete cascade,
    wishlist text not null,
    updated_at timestamptz not null default now()
);

-- Create indexes
create index wishes_participant_id_idx on public.wishes(participant_id);

-- Create updated_at trigger
create trigger handle_wishes_updated_at
    before update on public.wishes
    for each row
    execute procedure public.handle_updated_at();

-- Enable RLS
-- DISABLED FOR DEVELOPMENT: alter table public.wishes enable row level security;

-- Create policies

-- Policy: Group creators can view all wishes in their groups
-- DISABLED FOR DEVELOPMENT:
-- create policy "Group creators can view all wishes"
--     on public.wishes
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants p
--             join public.groups g on p.group_id = g.id
--             where 
--                 p.id = public.wishes.participant_id 
--                 and g.creator_id = auth.uid()
--         )
--     );

-- Policy: Participants can manage their own wishes
-- DISABLED FOR DEVELOPMENT:
-- create policy "Participants can manage their own wishes"
--     on public.wishes
--     for all
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants 
--             where 
--                 id = public.wishes.participant_id 
--                 and user_id = auth.uid()
--         )
--     )
--     with check (
--         exists (
--             select 1 
--             from public.participants 
--             where 
--                 id = public.wishes.participant_id 
--                 and user_id = auth.uid()
--         )
--     );

-- Policy: Participants can view wishes of others in their groups
-- DISABLED FOR DEVELOPMENT:
-- create policy "Participants can view wishes in their groups"
--     on public.wishes
--     for select
--     to authenticated
--     using (
--         exists (
--             select 1 
--             from public.participants p1
--             join public.participants p2 on p1.group_id = p2.group_id
--             where 
--                 p2.id = public.wishes.participant_id 
--                 and p1.user_id = auth.uid()
--         )
--     );

-- Grant access
grant usage on sequence public.wishes_id_seq to authenticated;
grant all on public.wishes to authenticated;

comment on table public.wishes is 'Wish lists for Secret Santa participants';
comment on column public.wishes.participant_id is 'Reference to the participant';
comment on column public.wishes.wishlist is 'The actual wish list content';
