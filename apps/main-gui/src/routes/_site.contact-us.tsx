import { createFileRoute } from "@tanstack/react-router";
import { ContactUs } from "../contact-us";

export const Route = createFileRoute("/_site/contact-us")({
  component: ContactUs,
});
