CREATE OR REPLACE FUNCTION GetApprovalWorkflowPermissions(UserId INT)
    RETURNS TABLE (
                      PermissionId INT,
                      StageId INT,
                      CreatedAt TIMESTAMPTZ
                  )
AS $$
BEGIN
    RETURN QUERY
        SELECT PermissionId, StageId, CreatedAt
        FROM ApprovalWorkflowPermissions
        WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
