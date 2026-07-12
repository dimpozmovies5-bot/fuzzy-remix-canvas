import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  component: AppShell,
  ssr: false,
});

function AppShell() {
  return <App />;
}
