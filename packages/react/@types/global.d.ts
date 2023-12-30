import "@mui/material";

declare module "*.webp";

declare module "@mui/material/styles" {
  interface Palette {
    highlight1: Palette["primary"];
    highlight2: Palette["primary"];
    highlight3: Palette["primary"];
    highlight4: Palette["primary"];
  }

  interface PaletteOptions {
    highlight1?: PaletteOptions["primary"];
    highlight2?: PaletteOptions["primary"];
    highlight3?: PaletteOptions["primary"];
    highlight4?: PaletteOptions["primary"];
  }
}

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
