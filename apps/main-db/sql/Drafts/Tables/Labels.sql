CREATE TABLE Labels (
    LabelId serial PRIMARY KEY,
    LabelName VARCHAR(50) NOT NULL,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
