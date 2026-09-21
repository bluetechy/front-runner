CREATE OR REPLACE PROCEDURE CreateApprovalDecision(
    RequestId INT,
    ApproverId INT,
    DecisionText TEXT,
    DecisionStatus VARCHAR(20)
)
AS $$
BEGIN
    INSERT INTO ApprovalDecisions (RequestId, ApproverId, DecisionText, DecisionStatus)
    VALUES (RequestId, ApproverId, DecisionText, DecisionStatus);
END;
$$ LANGUAGE plpgsql;
