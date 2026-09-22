import { createFileRoute } from "@tanstack/react-router";
import { Pricing } from "../pricing";

export const Route = createFileRoute("/pricing")({ component: Pricing });
