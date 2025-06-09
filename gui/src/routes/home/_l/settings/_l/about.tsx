import { useInvoke } from "#/hooks/useInvoke";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/_l/settings/_l/about")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: version } = useInvoke<string>("get_version");

  return (
    <ul className="w-full">
      <li>ethui {version}</li>
    </ul>
  );
}
