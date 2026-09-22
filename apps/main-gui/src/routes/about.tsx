import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/about")({
  component: () => <ComingSoon title="About" />,
});
