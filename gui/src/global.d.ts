import { BreakpointOverrides } from "@mui/material/styles";
import Chrome from "chrome";

declare namespace chrome {
  export default Chrome;
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    lighter: true;
  }
}

// https://github.com/mui/material-ui/issues/35251#issuecomment-1366844584
declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    sidebar: true;
  }
}
