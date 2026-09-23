import { createFileRoute } from "@tanstack/react-router";
import { Privacy } from "../privacy";

export const Route = createFileRoute("/_site/privacy")({ component: Privacy });
