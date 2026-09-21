-- "AcceptedByUserUUID" is qualified: "InvitedByUserUUID" is not the plain
-- "UserUUID" that would make "FK_OrganizationInvitations_Users" mean anything
-- either, so both ends are named.
ALTER TABLE "dbo"."OrganizationInvitations" ADD CONSTRAINT "FK_OrganizationInvitations_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."OrganizationInvitations" ADD CONSTRAINT "FK_OrganizationInvitations_Users_InvitedByUserUUID" FOREIGN KEY ("InvitedByUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."OrganizationInvitations" ADD CONSTRAINT "FK_OrganizationInvitations_Users_AcceptedByUserUUID" FOREIGN KEY ("AcceptedByUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
