-- snake_case on purpose: trigger plumbing, not app-facing API. See SCHEMA-NOTES.md.
CREATE FUNCTION "dbo"."update_modified_info" () RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
