import { createFileRoute } from "@tanstack/react-router";
import { Pricing } from "../pricing";

export const Route = createFileRoute("/_site/pricing")({ component: Pricing });
