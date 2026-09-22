import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_site/contact")({
  component: () => <ComingSoon title="Contact" />,
});
