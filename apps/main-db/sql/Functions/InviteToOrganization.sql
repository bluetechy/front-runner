--
-- Offer membership of an organization to an email address. Owners only, the
-- same bar dbo.JoinOrganization used to apply -- the difference is that this
-- creates an offer the invitee has to take up rather than a membership they
-- never agreed to.
--
-- Idempotent by (organization, address): inviting an address that already has
-- a row moves that row back to Pending with a fresh expiry rather than
-- creating a second one. That is also how an owner re-invites somebody who
-- declined, and how the offered role is changed before it is accepted.
--
-- The address is folded to lower case here, which is the only place that
-- happens -- dbo.AcceptOrganizationInvitation folds the caller's address the
-- same way and the two have to agree.
--
-- "Already a member" is asked of every verified address on an account rather
-- than only the one it signs in with. An account can hold several since
-- dbo.UserEmails, and somebody invited at the address they read mail at is
-- already in the room whether or not that is the address on their token.
-- dbo.Users."Email" is still consulted beside the table, because an account
-- that has not signed in since dbo.UserEmails existed has the column and no
-- rows, and an invitation it can never usefully accept is worse than a
-- redundant check.
--
CREATE FUNCTION "dbo"."InviteToOrganization" (_LoginName varchar(64), _OrganizationUUID uuid, _Email varchar(255), _IsOwner boolean DEFAULT false) RETURNS TABLE(
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
        _ActorUUID uuid = "dbo"."GetUserUUID"(_LoginName);
        _NormalizedEmail varchar(255) = lower(btrim(COALESCE(_Email, '')));
        _InvitationUUID uuid;
    BEGIN
        IF NOT "dbo"."IsOwnerOfOrganization"(_LoginName, _OrganizationUUID) THEN
            RAISE EXCEPTION 'Action cannot be performed.';
        END IF;

        IF _NormalizedEmail = '' OR position('@' IN _NormalizedEmail) < 2 THEN
            RAISE EXCEPTION 'An email address is required.';
        END IF;

        -- Inviting somebody who is already in would leave a Pending row that
        -- can never be accepted usefully.
        IF EXISTS (
            SELECT 1
            FROM "dbo"."UserOrganizations"
                JOIN "dbo"."Users" ON ("Users"."UserUUID" = "UserOrganizations"."UserUUID")
            WHERE "UserOrganizations"."OrganizationUUID" = _OrganizationUUID
                AND "Users"."IsEnabled" = true
                AND (
                    lower("Users"."Email") = _NormalizedEmail
                    OR EXISTS (
                        SELECT 1 FROM "dbo"."UserEmails"
                        WHERE "UserEmails"."UserUUID" = "Users"."UserUUID"
                            AND "UserEmails"."Email" = _NormalizedEmail
                            AND "UserEmails"."VerifiedAt" IS NOT NULL
                    )
                )
        ) THEN
            RAISE EXCEPTION 'That address is already a member of the organization.';
        END IF;

        INSERT INTO "dbo"."OrganizationInvitations" (
            "OrganizationUUID", "Email", "IsOwner", "Status", "InvitedByUserUUID",
            "AcceptedByUserUUID", "ExpiresAt", "RespondedAt", "CreatedBy"
        )
        VALUES (
            _OrganizationUUID, _NormalizedEmail, _IsOwner, 'Pending', _ActorUUID,
            NULL, CURRENT_TIMESTAMP + interval '14 days', NULL, _LoginName
        )
        ON CONFLICT ON CONSTRAINT "OrganizationInvitations_OrganizationAndEmail_UniqueKey" DO UPDATE SET
            "IsOwner" = EXCLUDED."IsOwner",
            "Status" = 'Pending',
            "InvitedByUserUUID" = EXCLUDED."InvitedByUserUUID",
            "AcceptedByUserUUID" = NULL,
            "ExpiresAt" = EXCLUDED."ExpiresAt",
            "RespondedAt" = NULL,
            "UpdatedBy" = _LoginName
        RETURNING "OrganizationInvitations"."InvitationUUID" INTO _InvitationUUID;

        RETURN QUERY SELECT * FROM "dbo"."GetInvitation"(_InvitationUUID);
    END;
$$ LANGUAGE plpgsql;
