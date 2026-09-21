CREATE OR REPLACE FUNCTION GetTasksByAssignee(AssigneeId INT)
    RETURNS TABLE (
                      TaskId INT,
                      Name VARCHAR(100),
                      Description TEXT,
                      DueDate DATE
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT TaskId, Name, Description, DueDate
        FROM RoadmapWorkflowTasks
        WHERE AssignedTo = AssigneeId;
END;
$$ LANGUAGE plpgsql;
