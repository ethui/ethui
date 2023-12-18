import {
  Typography as MuiTypography,
  TypographyProps as MuiTypographyProps,
} from "@mui/material";

export interface TypographyProps extends MuiTypographyProps {
  mono?: boolean;
}

export const Typography = ({ sx, mono, ...rest }: TypographyProps) => {
  let sxFull: TypographyProps["sx"] = sx;

  if (mono) {
    sxFull = {
      ...sx,
      ...{ overflowWrap: "break-word", fontFamily: "Roboto Mono" },
    };
  }

  return <MuiTypography sx={sxFull} {...rest} />;
};
