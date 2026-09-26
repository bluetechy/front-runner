import { createFileRoute } from "@tanstack/react-router";
import { WidgetStudio } from "../widget-studio";

export const Route = createFileRoute("/_app/widgets")({
  component: WidgetStudio,
});
