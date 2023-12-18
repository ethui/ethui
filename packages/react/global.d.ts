declare module "*.webp";

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    lighter: true;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    bordered: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    sidebar: true;
  }
}
