CREATE OR REPLACE PROCEDURE CreateApprovalProcess(
    ApprovalProcessName VARCHAR(100),
    Description TEXT
)
AS $$
BEGIN
    INSERT INTO ApprovalProcesses (Name, Description)
    VALUES (ApprovalProcessName, Description);
END;
$$ LANGUAGE plpgsql;
