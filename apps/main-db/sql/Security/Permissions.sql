--
-- Grants for the application user. The database name and the user are passed
-- in by bin/apply.sh so this file can be applied to the application database
-- and to the scratch database that bin/test.sh builds.
--

GRANT ALL ON DATABASE :"db_name" TO :"app_user";
GRANT ALL ON SCHEMA "dbo" TO :"app_user";
GRANT ALL ON ALL TABLES IN SCHEMA "dbo" TO :"app_user";
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "dbo" TO :"app_user";
GRANT ALL ON ALL PROCEDURES IN SCHEMA "dbo" TO :"app_user";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "dbo" TO :"app_user";
