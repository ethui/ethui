import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Typography } from "@mui/material";
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

  enqueueSnackbar(<Typography>{msg}</Typography>, {
    key,
    variant: "error",
    action: () => (
      <>
        <IconButton
          aria-label="close"
          color="inherit"
          sx={{ p: 0.5 }}
          onClick={() => closeSnackbar(key)}
        >
          <CloseIcon />
        </IconButton>
      </>
    ),
  });
}
