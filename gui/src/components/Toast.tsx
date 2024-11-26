import { Button } from "@ethui/ui/components/shadcn/button";
import { CircleX } from "lucide-react";
import { closeSnackbar, enqueueSnackbar } from "notistack";

export function errorToast(key: string, err: unknown) {
  let msg: string;
  if (err instanceof Error) {
    msg = err.message;
  } else if (typeof err === "string") {
    msg = err;
  } else {
    msg = JSON.stringify(err);
  }

  enqueueSnackbar(<span>{msg}</span>, {
    key,
    variant: "error",
    action: () => (
      <>
        <Button
          size="icon"
          aria-label="close"
          color="inherit"
          onClick={() => closeSnackbar(key)}
        >
          <CircleX />
        </Button>
      </>
    ),
  });
}
