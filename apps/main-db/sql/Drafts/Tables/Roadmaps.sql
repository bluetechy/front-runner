CREATE TABLE Roadmaps (
    RoadmapId serial PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
