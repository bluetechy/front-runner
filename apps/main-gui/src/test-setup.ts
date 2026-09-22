/*
 * @no-test  The test harness itself: it is loaded before every test file, so
 * a test asserting that it works could only pass by having already worked.
 *
 * Loaded before every test file (vite.config.ts, `test.setupFiles`).
 *
 * jest-dom adds the DOM matchers the icon tests are written against --
 * toBeInTheDocument, toHaveAttribute, toHaveStyle, toHaveTextContent -- to
 * Vitest's expect, and augments its types at the same time.
 */
import "@testing-library/jest-dom/vitest";
