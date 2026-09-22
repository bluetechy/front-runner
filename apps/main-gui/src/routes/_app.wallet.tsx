import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "../coming-soon";

export const Route = createFileRoute("/_app/wallet")({
  component: () => <ComingSoon title="Payment Wallet" />,
});
