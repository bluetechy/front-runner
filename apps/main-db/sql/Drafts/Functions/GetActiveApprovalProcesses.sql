CREATE OR REPLACE FUNCTION GetActiveApprovalProcesses()
    RETURNS TABLE (
                      ProcessId INT,
                      Name VARCHAR(100),
                      Description TEXT
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT ProcessId, Name, Description
        FROM ApprovalProcesses
        WHERE Completed = false;
END;
$$ LANGUAGE plpgsql;
