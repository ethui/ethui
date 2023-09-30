import { TerminalSharp } from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import { useKBar } from "kbar";

import { useTheme } from "../store";

export function CommandBarButton() {
  const kbar = useKBar();
  const { theme } = useTheme();

  const handleClick = () => kbar.query.toggle();

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="inherit"
        size="small"
        sx={{
          height: 40,
          width: 40,
          display: "none",
          [theme.breakpoints.down("sm")]: {
            display: "initial",
          },
        }}
      >
        <TerminalSharp />
      </IconButton>

      <Button
        variant="sidebar"
        startIcon={<TerminalSharp />}
        onClick={handleClick}
        sx={{
          [theme.breakpoints.down("sm")]: {
            display: "none",
          },
        }}
      >
        Command Bar
      </Button>
    </>
  );
}
