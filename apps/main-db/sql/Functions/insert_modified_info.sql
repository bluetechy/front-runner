-- snake_case on purpose: trigger plumbing, not app-facing API. See SCHEMA-NOTES.md.
CREATE FUNCTION "dbo"."insert_modified_info" () RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" := NEW."CreatedAt";
    NEW."UpdatedBy" := NEW."CreatedBy";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
