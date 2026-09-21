CREATE TABLE UserRoles (
    RoleId serial PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL,
    Description TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
