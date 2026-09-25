CREATE ROLE visits_reader WITH LOGIN;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO visits_reader', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO visits_reader;
GRANT SELECT ON events TO visits_reader;
