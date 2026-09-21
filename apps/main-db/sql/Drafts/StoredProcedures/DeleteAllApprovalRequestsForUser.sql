CREATE OR REPLACE PROCEDURE DeleteAllApprovalRequestsForUser(UserId INT)
AS $$
BEGIN
    DELETE FROM ApprovalRequests WHERE UserId = UserId;
END;
$$ LANGUAGE plpgsql;
