ALTER TABLE "dbo"."BadgeGroupRelationships" ADD CONSTRAINT "FK_BadgeGroupRelationships_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
ALTER TABLE "dbo"."BadgeGroupRelationships" ADD CONSTRAINT "FK_BadgeGroupRelationships_BadgeGroups" FOREIGN KEY ("BadgeGroupUUID") REFERENCES "dbo"."BadgeGroups" ("BadgeGroupUUID");
