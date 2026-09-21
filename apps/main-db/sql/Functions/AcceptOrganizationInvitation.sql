--
-- Take up an invitation, which is the only way a user joins an organization
-- they do not already belong to. The caller is the invitee: an invitation is
-- matched to them by the email address on their account, folded to lower case
-- the same way dbo.InviteToOrganization folded it when the row was written.
--
-- An invitation that is not Pending, has expired, or belongs to a disabled
-- organization is refused rather than silently ignored -- the invitee asked a
-- question and an empty answer would read as success.
--
-- The membership insert tolerates a conflict: an owner can add somebody and
-- invite them in either order, and arriving twice is not an error.
--
CREATE FUNCTION "dbo"."AcceptOrganizationInvitation" (_LoginName varchar(64), _InvitationUUID uuid) RETURNS TABLE(
    "InvitationUUID" uuid,
    "OrganizationUUID" uuid,
    "OrganizationName" varchar(64),
    "Email" varchar(255),
    "IsOwner" boolean,
    "Status" varchar(16),
    "ExpiresAt" TIMESTAMPTZ,
    "RespondedAt" TIMESTAMPTZ,
    "InvitedByLoginName" varchar(64)
) AS $$
    DECLARE
        _Actor record;
        _Invitation record;
    BEGIN
        SELECT "Users"."UserUUID", lower(btrim("Users"."Email")) AS "Email", "Users"."IsEnabled"
        INTO _Actor
        FROM "dbo"."Users"
        WHERE "Users"."LoginName" = _LoginName;

        IF NOT FOUND OR NOT _Actor."IsEnabled" OR _Actor."Email" = '' THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        SELECT
            "OrganizationInvitations"."OrganizationUUID",
            "OrganizationInvitations"."Email",
            "OrganizationInvitations"."IsOwner",
            "OrganizationInvitations"."Status",
            "OrganizationInvitations"."ExpiresAt"
        INTO _Invitation
        FROM "dbo"."OrganizationInvitations"
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;

        IF NOT FOUND OR _Invitation."Email" <> _Actor."Email" THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;
        IF _Invitation."Status" <> 'Pending' THEN
            RAISE EXCEPTION 'That invitation has already been answered.';
        END IF;
        IF _Invitation."ExpiresAt" <= CURRENT_TIMESTAMP THEN
            RAISE EXCEPTION 'That invitation has expired.';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM "dbo"."Organizations"
            WHERE "Organizations"."OrganizationUUID" = _Invitation."OrganizationUUID"
                AND "Organizations"."IsEnabled" = true
        ) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        INSERT INTO "dbo"."UserOrganizations" ("UserUUID", "OrganizationUUID", "IsOwner", "CreatedBy")
        VALUES (_Actor."UserUUID", _Invitation."OrganizationUUID", _Invitation."IsOwner", _LoginName)
        ON CONFLICT ON CONSTRAINT "UserOrganizations_UUIDs_UniqueKey" DO NOTHING;

        UPDATE "dbo"."OrganizationInvitations" SET
            "Status" = 'Accepted',
            "AcceptedByUserUUID" = _Actor."UserUUID",
            "RespondedAt" = CURRENT_TIMESTAMP,
            "UpdatedBy" = _LoginName
        WHERE "OrganizationInvitations"."InvitationUUID" = _InvitationUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetInvitation"(_InvitationUUID);
    END;
$$ LANGUAGE plpgsql;
