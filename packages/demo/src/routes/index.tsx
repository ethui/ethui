import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => ({ breadcrumb: "Home" }),
  component: Home,
});

function Home() {
  return (
    <div>
      <Button
        onClick={() => {
          //updateCount({ data: 1 }).then(() => {
          //  router.invalidate();
          //});
        }}
      >
        Add 1 to state?
      </Button>
    </div>
  );
}
