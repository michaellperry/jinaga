--
-- Create tables for a Jinaga database
--
-- Before executing, be sure you have created the database and the dev role.
--
-- CREATE DATABASE myapplication;
-- \connect myapplication
--
-- CREATE USER dev WITH
--   LOGIN
--   ENCRYPTED PASSWORD 'devpassword'
--   NOSUPERUSER
--   INHERIT
--   NOCREATEDB
--   NOCREATEROLE
--   NOREPLICATION
--   VALID UNTIL 'infinity';
--

DO
$do$
BEGIN

--
-- Edge
--

IF (SELECT to_regclass('public.edge') IS NULL) THEN

    CREATE TABLE public.edge (
        successor_type character varying(50),
        successor_hash character varying(100),
        predecessor_type character varying(50),
        predecessor_hash character varying(100),
        role character varying(20)
    );

    ALTER TABLE public.edge OWNER TO postgres;

    -- Most unique first, for fastest uniqueness check on insert.
    CREATE UNIQUE INDEX ux_edge ON public.edge USING btree (successor_hash, predecessor_hash, role, successor_type, predecessor_type);
    -- Covering index based on successor, favoring most likely members of WHERE clause.
    CREATE INDEX ix_successor ON public.edge USING btree (successor_hash, role, successor_type, predecessor_hash, predecessor_type);
    -- Covering index based on predecessor, favoring most likely members of WHERE clause.
    CREATE INDEX ix_predecessor ON public.edge USING btree (predecessor_hash, role, predecessor_type, successor_hash, successor_type);

    GRANT SELECT,INSERT ON TABLE public.edge TO dev;

END IF;

--
-- Fact
--

IF (SELECT to_regclass('public.fact') IS NULL) THEN

    CREATE TABLE public.fact (
        type character varying(50),
        hash character varying(100),
        fields jsonb,
        predecessors jsonb,
        date_learned timestamp NOT NULL
            DEFAULT (now() at time zone 'utc')
    );


    ALTER TABLE public.fact OWNER TO postgres;

    CREATE UNIQUE INDEX ux_fact ON public.fact USING btree (hash, type);

    GRANT SELECT,INSERT ON TABLE public.fact TO dev;

ELSE

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='fact' AND column_name='date_learned') THEN

        ALTER TABLE public.fact
            ADD date_learned timestamp NOT NULL
            DEFAULT (now() at time zone 'utc');
            
    END IF;

END IF;

--
-- User
--

IF (SELECT to_regclass('public.user') IS NULL) THEN

    CREATE TABLE public."user" (
        provider character varying(100),
        user_id character varying(50),
        private_key character varying(1800),
        public_key character varying(500)
    );


    ALTER TABLE public."user" OWNER TO postgres;

    CREATE UNIQUE INDEX ux_user ON public."user" USING btree (user_id, provider);

    GRANT SELECT,INSERT ON TABLE public."user" TO dev;

ELSE

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user' AND column_name='public_key'
            AND character_maximum_length >= 500) THEN
        
        ALTER TABLE public.user
            ALTER COLUMN public_key TYPE character varying(500);
        
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user' AND column_name='private_key'
            AND character_maximum_length >= 1800) THEN
        
        ALTER TABLE public.user
            ALTER COLUMN private_key TYPE character varying(1800);
        
    END IF;


END IF;

--
-- Signature
--

IF (SELECT to_regclass('public.signature') IS NULL) THEN

    CREATE TABLE public."signature" (
        type character varying(50),
        hash character varying(100),
        public_key character varying(500),
        signature character varying(400),
        date_learned timestamp NOT NULL
            DEFAULT (now() at time zone 'utc')
    );


    ALTER TABLE public."signature" OWNER TO postgres;

    CREATE UNIQUE INDEX ux_signature ON public."signature" USING btree (hash, public_key, type);

    GRANT SELECT,INSERT ON TABLE public."signature" TO dev;

ELSE

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='signature' AND column_name='public_key'
            AND character_maximum_length >= 500) THEN
        
        ALTER TABLE public.signature
            ALTER COLUMN public_key TYPE character varying(500);
        
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='signature' AND column_name='signature'
            AND character_maximum_length >= 400) THEN
        
        ALTER TABLE public.signature
            ALTER COLUMN signature TYPE character varying(400);
        
    END IF;

END IF;

END
$do$
