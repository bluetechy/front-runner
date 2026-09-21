ALTER TABLE "dbo"."Tasks" ADD CONSTRAINT "FK_Tasks_Organizations" FOREIGN KEY ("OrganizationUUID") REFERENCES "dbo"."Organizations" ("OrganizationUUID");
ALTER TABLE "dbo"."Tasks" ADD CONSTRAINT "FK_Tasks_Roadmaps" FOREIGN KEY ("RoadmapUUID") REFERENCES "dbo"."Roadmaps" ("RoadmapUUID");
ALTER TABLE "dbo"."Tasks" ADD CONSTRAINT "FK_Tasks_Users" FOREIGN KEY ("AssignedUserUUID") REFERENCES "dbo"."Users" ("UserUUID");
