-- Both user columns are qualified. The convention leaves the first foreign key
-- to a table unsuffixed, but neither of these is the plain "UserUUID" that
-- would make "FK_PointTransfers_Users" mean anything.
ALTER TABLE "dbo"."PointTransfers" ADD CONSTRAINT "FK_PointTransfers_Users_SenderUserUUID" FOREIGN KEY ("SenderUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."PointTransfers" ADD CONSTRAINT "FK_PointTransfers_Users_ReceiverUserUUID" FOREIGN KEY ("ReceiverUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
ALTER TABLE "dbo"."PointTransfers" ADD CONSTRAINT "FK_PointTransfers_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."PointTransfers" ADD CONSTRAINT "FK_PointTransfers_Points" FOREIGN KEY ("PointUUID") REFERENCES "dbo"."Points" ("PointUUID");
