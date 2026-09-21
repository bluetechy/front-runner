CREATE OR REPLACE PROCEDURE ExtendTaskDeadline(
    TaskId INT,
    NewDueDate DATE
)
AS $$
BEGIN
    -- Extend the deadline of the specified task.
    -- Implement task deadline extension logic here.
END;
$$ LANGUAGE plpgsql;
