CREATE OR REPLACE PROCEDURE CreateRoadmapWorkflow(
    RoadmapWorkflowName VARCHAR(100),
    Description TEXT
)
AS $$
BEGIN
    INSERT INTO RoadmapWorkflow (Name, Description)
    VALUES (RoadmapWorkflowName, Description);
END;
$$ LANGUAGE plpgsql;
