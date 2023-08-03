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
        sx={{
          height: 40,
          width: 40,
          display: "none",
          [theme.breakpoints.down("md")]: {
            display: "initial",
          },
        }}
      >
        <TerminalSharpIcon />
      </IconButton>

      <Button
        color="inherit"
        fullWidth
        startIcon={<TerminalSharpIcon />}
        onClick={handleClick}
        sx={{
          justifyContent: "flex-start",
          [theme.breakpoints.down("md")]: {
            display: "none",
          },
        }}
      >
        Command Bar
      </Button>
    </>
  );
}
