/*
 * @no-test  The test harness itself: it is loaded before every test file, so
 * a test asserting that it works could only pass by having already worked.
 *
 * jest-dom adds the DOM matchers these tests are written against --
 * toBeInTheDocument, toHaveAttribute, toHaveStyle, toHaveTextContent -- to
 * Vitest's expect, and augments its types at the same time. Same harness as
 * main-gui's, for the same reason: an element is judged by what it renders.
 */
import "@testing-library/jest-dom/vitest";
//# sourceMappingURL=test-setup.js.map