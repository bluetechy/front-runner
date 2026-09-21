--
-- Connection
--

\connect dbo

--
-- Function: insert_modified_info
--

CREATE FUNCTION "dbo"."insert_modified_info" () RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" := NEW."CreatedAt";
    NEW."UpdatedBy" := NEW."CreatedBy";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--
-- Function: update_modified_info
--

CREATE FUNCTION "dbo"."update_modified_info" () RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
