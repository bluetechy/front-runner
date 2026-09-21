CREATE TABLE ApprovalProcessLogs (
    LogId serial PRIMARY KEY,
    RequestId INT REFERENCES ApprovalRequests(RequestId),
    FromStageId INT REFERENCES ApprovalWorkflowStages(StageId),
    ToStageId INT REFERENCES ApprovalWorkflowStages(StageId),
    LogText TEXT,
    LogTimestamp TIMESTAMPTZ DEFAULT NOW()
);
