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

CREATE EXTENSION IF NOT EXISTS "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE public.user_role AS ENUM ('curator', 'validator');

CREATE OR REPLACE FUNCTION "public"."decrement_likes_count"("claim_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
UPDATE claims 
SET likes = likes - 1
WHERE id = claim_id;
END;$$;

ALTER FUNCTION "public"."decrement_likes_count"("claim_id" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."increment_likes_count"("claim_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
UPDATE claims 
SET likes = likes + 1
WHERE id = claim_id;
END;$$;

ALTER FUNCTION "public"."increment_likes_count"("claim_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."likes" (
    "claim_id" "text" NOT NULL,
    "pubkey" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."likes" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "pubkey" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "proof" "jsonb" NOT NULL,
    "proof_args" "jsonb" NOT NULL,
    "proof_semaphore_group" "jsonb",
    "proof_semaphore_group_args" "jsonb",
    "group_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pubkey_expiry" timestamp with time zone,
    "role" public.user_role,
    "semaphore_identity_commitment" text,
    "org_email_hash" text
);

ALTER TABLE "public"."memberships" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "text" NOT NULL,
    "text" "text" NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "signature" "text" NOT NULL,
    "pubkey" "text" NOT NULL,
    "internal" boolean NOT NULL,
    "likes" numeric DEFAULT '0'::numeric NOT NULL,
    "group_id" "text" NOT NULL,
    "group_provider" "text" NOT NULL,
    "tweeted" boolean DEFAULT false
);

ALTER TABLE "public"."messages" OWNER TO "postgres";

COMMENT ON TABLE "public"."messages" IS 'Anon messages for all domains';

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "keys_pkey" PRIMARY KEY ("pubkey");

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("claim_id", "pubkey");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pubkey_fkey" FOREIGN KEY ("pubkey") REFERENCES "public"."memberships"("pubkey");

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pubkey_fkey" FOREIGN KEY ("pubkey") REFERENCES "public"."memberships"("pubkey");

ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."decrement_likes_count"("claim_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("claim_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"("claim_id" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."increment_likes_count"("claim_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("claim_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_likes_count"("claim_id" "text") TO "service_role";

GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";

GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS role public.user_role,
  ADD COLUMN IF NOT EXISTS semaphore_identity_commitment text;

CREATE TABLE IF NOT EXISTS public.claims (
  id text NOT NULL PRIMARY KEY,
  curator_pubkey text NOT NULL REFERENCES public.memberships(pubkey),
  signature text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  source_url text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz, --- only when status == closed
  vote_deadline timestamptz NOT NULL,
  --vote_status text GENERATED ALWAYS AS (
  --  CASE WHEN now() < vote_deadline THEN 'active' ELSE 'closed' END
  --) STORED,
  internal boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  likes numeric DEFAULT 0 NOT NULL,
  group_id text NOT NULL,
  group_provider text NOT NULL,
  tweeted boolean DEFAULT false,
  CONSTRAINT claims_status_check CHECK (status IN ('pending', 'active', 'closed', 'rejected'))
);

CREATE TABLE IF NOT EXISTS public.evidence_files (
  id text NOT NULL PRIMARY KEY,
  claim_id text NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.vote_type AS ENUM ('up', 'down');

CREATE TABLE IF NOT EXISTS public.claim_votes (
  id text NOT NULL PRIMARY KEY,
  claim_id text NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  voter_pubkey text NOT NULL REFERENCES public.memberships(pubkey),
  role public.user_role NOT NULL, -- check again if needed
  vote public.vote_type NOT NULL,
  vote_nullifier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, voter_pubkey) -- one vote per user per claim
);

CREATE TABLE IF NOT EXISTS public.whitelisted_domains (
  id text NOT NULL PRIMARY KEY,
  group_id text NOT NULL,
  active boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claims_created_at ON public.claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_votes_claim_id ON public.claim_votes(claim_id);

RESET ALL;