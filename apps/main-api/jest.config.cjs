module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/.test-dist"],
  testMatch: ["**/*.test.js"],
  transform: {},
  setupFiles: ["<rootDir>/scripts/test-environment.cjs"],
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: 2,
  collectCoverageFrom: [
    ".test-dist/**/*.js",
    "!.test-dist/**/*.test.js",
    "!.test-dist/main.js",
  ],
  coverageDirectory: "coverage",
};
