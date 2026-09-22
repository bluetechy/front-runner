import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_app/customer-service")({
  component: () => <ComingSoon title="Customer Service" />,
});
