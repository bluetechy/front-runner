import { createFileRoute } from "@tanstack/react-router";
import { Security } from "../security";

export const Route = createFileRoute("/_app/security-and-access")({
  component: Security,
});
