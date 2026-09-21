ALTER TABLE "dbo"."BadgeReviews" ADD CONSTRAINT "FK_BadgeReviews_Badges" FOREIGN KEY ("BadgeUUID") REFERENCES "dbo"."Badges" ("BadgeUUID");
ALTER TABLE "dbo"."BadgeReviews" ADD CONSTRAINT "FK_BadgeReviews_Users" FOREIGN KEY ("UserUUID") REFERENCES "dbo"."Users" ("UserUUID");
