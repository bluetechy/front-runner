import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "../wallet";

export const Route = createFileRoute("/_app/wallet")({ component: Wallet });
