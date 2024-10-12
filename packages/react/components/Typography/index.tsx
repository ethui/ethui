import {
  Typography as MuiTypography,
  type TypographyProps as MuiTypographyProps,
} from "@mui/material";

export interface TypographyProps extends MuiTypographyProps {
  mono?: boolean;
}

export const Typography = ({ sx, mono, ...rest }: TypographyProps) => {
  let sxFull: TypographyProps["sx"] = sx;

  if (mono) {
    sxFull = {
      ...{
        overflowWrap: "anywhere",
        fontFamily: "Roboto Mono",
        textAlign: "left",
      },
      ...sx,
    };
  }

  return <MuiTypography sx={sxFull} {...rest} />;
};
