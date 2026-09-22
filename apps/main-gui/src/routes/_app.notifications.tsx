import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "../notifications";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});
