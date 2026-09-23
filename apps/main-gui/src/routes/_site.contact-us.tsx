import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "../contact";

export const Route = createFileRoute("/_site/contact-us")({
  component: Contact,
});
