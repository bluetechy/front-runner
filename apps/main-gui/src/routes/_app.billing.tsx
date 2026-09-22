import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_app/billing")({
  component: () => <ComingSoon title="Billing & Subscription" />,
});
