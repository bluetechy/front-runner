import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_app/schedule")({
  component: () => <ComingSoon title="Schedule" />,
});
