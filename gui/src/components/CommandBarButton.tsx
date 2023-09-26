import TerminalSharpIcon from "@mui/icons-material/TerminalSharp";
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
        <TerminalSharpIcon />
      </IconButton>

      <Button
        variant="sidebar"
        startIcon={<TerminalSharpIcon />}
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
