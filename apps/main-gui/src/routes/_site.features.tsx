import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_site/features")({
  component: () => <ComingSoon title="Features" />,
});
