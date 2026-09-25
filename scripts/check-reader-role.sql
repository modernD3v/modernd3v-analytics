SELECT version() AS server_version;

WITH RECURSIVE memberships AS (
  SELECT m.roleid AS oid
  FROM pg_auth_members m
  JOIN pg_roles member_role ON member_role.oid = m.member
  WHERE member_role.rolname = 'visits_reader'
  UNION
  SELECT m.roleid
  FROM pg_auth_members m
  JOIN memberships ms ON ms.oid = m.member
)
SELECT COALESCE(
  (SELECT string_agg(r.rolname, ', ' ORDER BY r.rolname) FROM memberships ms JOIN pg_roles r ON r.oid = ms.oid),
  '(none)'
) AS memberships;

SELECT
  has_table_privilege('visits_reader', 'events', 'INSERT') AS can_insert,
  has_table_privilege('visits_reader', 'events', 'UPDATE') AS can_update,
  has_table_privilege('visits_reader', 'events', 'DELETE') AS can_delete,
  has_table_privilege('visits_reader', 'events', 'TRUNCATE') AS can_truncate,
  has_schema_privilege('visits_reader', 'public', 'CREATE') AS can_create;
