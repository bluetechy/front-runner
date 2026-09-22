import { createFileRoute } from "@tanstack/react-router";
import { SignedIn } from "../signed-in";

export const Route = createFileRoute("/signed-in")({ component: SignedIn });
