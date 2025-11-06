


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_group_participants"("p_group_id" bigint) RETURNS TABLE("participant_id" bigint, "participant_name" "text", "participant_email" "public"."citext", "user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_group_participants"("p_group_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_group_participants"("p_group_id" bigint) IS 'Returns all participants in a specific group';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    return exists (
        select 1 
        from public.groups 
        where 
            id = p_group_id 
            and creator_id = p_user_id
    );
end;
$$;


ALTER FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) IS 'Checks if a user is the creator of a specific group';



CREATE OR REPLACE FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    return exists (
        select 1 
        from public.participants 
        where 
            group_id = p_group_id 
            and user_id = p_user_id
    );
end;
$$;


ALTER FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) IS 'Checks if a user is a participant in a specific group';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "giver_participant_id" bigint NOT NULL,
    "receiver_participant_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "no_self_assignment" CHECK (("giver_participant_id" <> "receiver_participant_id"))
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."assignments" IS 'Stores Secret Santa draw results. Each row represents a giver-receiver pair.';



COMMENT ON COLUMN "public"."assignments"."group_id" IS 'Reference to the Secret Santa group this assignment belongs to';



COMMENT ON COLUMN "public"."assignments"."giver_participant_id" IS 'Participant who will give the gift (the "Santa")';



COMMENT ON COLUMN "public"."assignments"."receiver_participant_id" IS 'Participant who will receive the gift';



COMMENT ON COLUMN "public"."assignments"."created_at" IS 'Timestamp when the assignment was created (when draw was performed)';



CREATE SEQUENCE IF NOT EXISTS "public"."assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."assignments_id_seq" OWNED BY "public"."assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."exclusion_rules" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "blocker_participant_id" bigint NOT NULL,
    "blocked_participant_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "different_participants" CHECK (("blocker_participant_id" <> "blocked_participant_id"))
);


ALTER TABLE "public"."exclusion_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."exclusion_rules" IS 'Warning: RLS policies have been disabled for this table';



COMMENT ON COLUMN "public"."exclusion_rules"."group_id" IS 'Reference to the Secret Santa group';



COMMENT ON COLUMN "public"."exclusion_rules"."blocker_participant_id" IS 'Participant who cannot give a gift to the blocked participant';



COMMENT ON COLUMN "public"."exclusion_rules"."blocked_participant_id" IS 'Participant who cannot receive a gift from the blocker participant';



CREATE SEQUENCE IF NOT EXISTS "public"."exclusion_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exclusion_rules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exclusion_rules_id_seq" OWNED BY "public"."exclusion_rules"."id";



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "budget" numeric NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "groups_budget_check" CHECK (("budget" > (0)::numeric))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."groups" IS 'Warning: RLS policies have been disabled for this table';



COMMENT ON COLUMN "public"."groups"."name" IS 'Name of the Secret Santa group';



COMMENT ON COLUMN "public"."groups"."budget" IS 'Budget limit for gifts in the group';



COMMENT ON COLUMN "public"."groups"."end_date" IS 'Deadline for the Secret Santa event';



COMMENT ON COLUMN "public"."groups"."creator_id" IS 'Reference to the user who created the group';



CREATE SEQUENCE IF NOT EXISTS "public"."groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."groups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."groups_id_seq" OWNED BY "public"."groups"."id";



CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" bigint NOT NULL,
    "group_id" bigint NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "public"."citext",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "access_token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "result_viewed_at" timestamp with time zone
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."participants" IS 'Warning: RLS policies have been disabled for this table';



COMMENT ON COLUMN "public"."participants"."group_id" IS 'Reference to the Secret Santa group';



COMMENT ON COLUMN "public"."participants"."user_id" IS 'Optional reference to registered user account';



COMMENT ON COLUMN "public"."participants"."name" IS 'Display name of the participant';



COMMENT ON COLUMN "public"."participants"."email" IS 'Optional email for unregistered participants';



COMMENT ON COLUMN "public"."participants"."access_token" IS 'Unique access token for unregistered participants to view their Secret Santa results';



COMMENT ON COLUMN "public"."participants"."result_viewed_at" IS 'Timestamp when the participant viewed their Secret Santa result. NULL if not viewed yet.';



CREATE SEQUENCE IF NOT EXISTS "public"."participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."participants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."participants_id_seq" OWNED BY "public"."participants"."id";



CREATE TABLE IF NOT EXISTS "public"."wishes" (
    "id" bigint NOT NULL,
    "participant_id" bigint NOT NULL,
    "wishlist" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wishes" OWNER TO "postgres";


COMMENT ON TABLE "public"."wishes" IS 'Warning: RLS policies have been disabled for this table';



COMMENT ON COLUMN "public"."wishes"."participant_id" IS 'Reference to the participant';



COMMENT ON COLUMN "public"."wishes"."wishlist" IS 'The actual wish list content';



CREATE SEQUENCE IF NOT EXISTS "public"."wishes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."wishes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."wishes_id_seq" OWNED BY "public"."wishes"."id";



ALTER TABLE ONLY "public"."assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exclusion_rules" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exclusion_rules_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."groups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."groups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."participants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."participants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."wishes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."wishes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exclusion_rules"
    ADD CONSTRAINT "exclusion_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exclusion_rules"
    ADD CONSTRAINT "unique_exclusion_rule" UNIQUE ("group_id", "blocker_participant_id", "blocked_participant_id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "unique_giver_per_group" UNIQUE ("group_id", "giver_participant_id");



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_participant_id_unique" UNIQUE ("participant_id");



COMMENT ON CONSTRAINT "wishes_participant_id_unique" ON "public"."wishes" IS 'Ensures one wishlist per participant';



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_pkey" PRIMARY KEY ("id");



CREATE INDEX "assignments_giver_idx" ON "public"."assignments" USING "btree" ("giver_participant_id");



CREATE INDEX "assignments_group_id_idx" ON "public"."assignments" USING "btree" ("group_id");



CREATE INDEX "assignments_receiver_idx" ON "public"."assignments" USING "btree" ("receiver_participant_id");



CREATE INDEX "exclusion_rules_blocked_participant_id_idx" ON "public"."exclusion_rules" USING "btree" ("blocked_participant_id");



CREATE INDEX "exclusion_rules_blocker_participant_id_idx" ON "public"."exclusion_rules" USING "btree" ("blocker_participant_id");



CREATE INDEX "exclusion_rules_group_id_idx" ON "public"."exclusion_rules" USING "btree" ("group_id");



CREATE INDEX "groups_creator_id_idx" ON "public"."groups" USING "btree" ("creator_id");



CREATE INDEX "groups_end_date_idx" ON "public"."groups" USING "btree" ("end_date");



CREATE INDEX "idx_groups_created_at_desc" ON "public"."groups" USING "btree" ("created_at" DESC);



COMMENT ON INDEX "public"."idx_groups_created_at_desc" IS 'Optimizes sorting groups by creation date in descending order';



CREATE INDEX "idx_participants_group_user" ON "public"."participants" USING "btree" ("group_id", "user_id");



COMMENT ON INDEX "public"."idx_participants_group_user" IS 'Optimizes participant lookup by group and user for access control checks';



CREATE UNIQUE INDEX "participants_access_token_idx" ON "public"."participants" USING "btree" ("access_token");



CREATE INDEX "participants_group_id_idx" ON "public"."participants" USING "btree" ("group_id");



CREATE INDEX "participants_result_viewed_at_idx" ON "public"."participants" USING "btree" ("result_viewed_at");



CREATE INDEX "participants_user_id_idx" ON "public"."participants" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_participant_email_per_group" ON "public"."participants" USING "btree" ("group_id", "email") WHERE ("email" IS NOT NULL);



CREATE INDEX "wishes_participant_id_idx" ON "public"."wishes" USING "btree" ("participant_id");



CREATE OR REPLACE TRIGGER "handle_groups_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_wishes_updated_at" BEFORE UPDATE ON "public"."wishes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_giver_participant_id_fkey" FOREIGN KEY ("giver_participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_receiver_participant_id_fkey" FOREIGN KEY ("receiver_participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exclusion_rules"
    ADD CONSTRAINT "exclusion_rules_blocked_participant_id_fkey" FOREIGN KEY ("blocked_participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exclusion_rules"
    ADD CONSTRAINT "exclusion_rules_blocker_participant_id_fkey" FOREIGN KEY ("blocker_participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exclusion_rules"
    ADD CONSTRAINT "exclusion_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wishes"
    ADD CONSTRAINT "wishes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_participants"("p_group_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_participants"("p_group_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_participants"("p_group_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_creator"("p_user_id" "uuid", "p_group_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_group"("p_user_id" "uuid", "p_group_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assignments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."exclusion_rules" TO "anon";
GRANT ALL ON TABLE "public"."exclusion_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."exclusion_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exclusion_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exclusion_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exclusion_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wishes" TO "anon";
GRANT ALL ON TABLE "public"."wishes" TO "authenticated";
GRANT ALL ON TABLE "public"."wishes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wishes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wishes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wishes_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
