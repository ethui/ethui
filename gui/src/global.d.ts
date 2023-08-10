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
