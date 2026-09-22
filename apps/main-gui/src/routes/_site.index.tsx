import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "../landing";

export const Route = createFileRoute("/_site/")({ component: Hero });
