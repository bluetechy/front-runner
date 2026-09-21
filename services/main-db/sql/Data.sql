--
-- Connection
--

\connect dbo

--
-- Seed Database
--

DO $$
DECLARE
    _Admin varchar(64) := 'admin';
    _BadgeUUID uuid := public.uuid_generate_v4();
    _CreatedBy varchar(64) := 'matthewm';
    _OrganizationUUID uuid := public.uuid_generate_v4();
    _PointUUID uuid := public.uuid_generate_v4();
    _TeamUUID uuid := public.uuid_generate_v4();
    _UserUUID uuid := public.uuid_generate_v4();
BEGIN
    INSERT INTO "dbo"."Organizations" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Unicity International', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "TeamUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, _TeamUUID, 'API Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Checkout Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Content Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Flex Team (Asia)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Growth Team (Asia)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Growth Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Portal Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Shop Team (Asia)', _CreatedBy);
    INSERT INTO "dbo"."Teams" ("OrganizationUUID", "Name", "CreatedBy") VALUES (_OrganizationUUID, 'Shop Team (US)', _CreatedBy);
    INSERT INTO "dbo"."Users" ("UserUUID", "Name", "LoginName", "Email", "IsAdmin", "CreatedBy") VALUES (public.uuid_generate_v4(), 'Admin', _Admin, 'support@unicity.com', true, _Admin);
    INSERT INTO "dbo"."Users" ("UserUUID", "Name", "LoginName", "Email", "IsAdmin", "CreatedBy") VALUES (_UserUUID, 'Matthew Mattson', _CreatedBy, 'matthew.mattson@unicity.com', false, _CreatedBy);
    INSERT INTO "dbo"."Badges" ("BadgeUUID", "Name", "Description", "CreatedBy") VALUES (_BadgeUUID, 'Rookie', 'First Badge', _CreatedBy);
    INSERT INTO "dbo"."Points" ("PointUUID", "Name", "Description", "CreatedBy") VALUES (_PointUUID, 'Points', '', _CreatedBy);
    INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "IsOwner", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, true, _CreatedBy);
    INSERT INTO "dbo"."UserTeams" ("UserUUID", "TeamUUID", "IsManager", "CreatedBy") VALUES (_UserUUID, _TeamUUID, true, _CreatedBy);
    INSERT INTO "dbo"."UserBadges" ("UserUUID", "OrganizationUUID", "BadgeUUID", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _BadgeUUID, _CreatedBy);
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointUUID, 'Starting Balance', 1.00, _CreatedBy);
    INSERT INTO "dbo"."UserPoints" ("UserUUID", "OrganizationUUID", "PointUUID", "Description", "Amount", "ExpiresAt", "CreatedBy") VALUES (_UserUUID, _OrganizationUUID, _PointUUID, 'Bonus', 3.00, '2024-07-16 00:00:00', _CreatedBy);
END $$;
