CREATE TABLE PointMultipliers (
    MultiplierId serial PRIMARY KEY,
    MultiplierName VARCHAR(100) NOT NULL,
    MultiplierDescription TEXT,
    StartDate TIMESTAMPTZ,
    EndDate TIMESTAMPTZ,
    MultiplierFactor DECIMAL(5,2) NOT NULL, -- Decimal representing the multiplier factor
    CreatedAt TIMESTAMPTZ DEFAULT NOW()
);
