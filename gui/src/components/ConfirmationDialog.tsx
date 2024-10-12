import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { type ReactNode, useState } from "react";

interface Props {
  onConfirm: () => unknown;
  content: ReactNode;
  title: string;
  confirmationLabel: string;
  children: ({
    onOpen,
    onClose,
  }: {
    onOpen: () => unknown;
    onClose: () => unknown;
  }) => ReactNode;
}

export function ConfirmationDialog({
  children,
  onConfirm,
  content,
  confirmationLabel,
  title,
}: Props) {
  const [open, setOpen] = useState(false);

  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

  const doConfirm = () => {
    onClose();
    onConfirm();
  };

  return (
    <>
      {children({ onOpen, onClose })}
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="draggable-dialog-title"
      >
        <DialogTitle style={{ cursor: "move" }} id="draggable-dialog-title">
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{content}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={doConfirm}>{confirmationLabel}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
