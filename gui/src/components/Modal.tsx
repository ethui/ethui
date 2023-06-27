import { Modal as MuiModal, Paper } from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  children: React.ReactNode;
  sx?: React.CSSProperties;
}

export function Modal({ children, sx, ...props }: Props) {
  return (
    <MuiModal
      {...props}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Paper sx={style({ sx })}>{children}</Paper>
    </MuiModal>
  );
}

const style = ({ sx }: { sx?: React.CSSProperties }) => {
  return {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    bgcolor: "background.paper",
    overflowY: "scroll",
    boxShadow: 24,
    width: 400,
    p: 4,
    ...sx,
  };
};
