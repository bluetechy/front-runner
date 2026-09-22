import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_app/security")({
  component: () => <ComingSoon title="Security & Login" />,
});
