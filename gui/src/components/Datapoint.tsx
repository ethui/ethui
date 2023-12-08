import { Grid, Typography } from "@mui/material";

interface DatapointProps {
  label: string;
  value: React.ReactNode | string;
  short: boolean;
}

export function Datapoint({ label, value, short }: DatapointProps) {
  return (
    <Grid item xs={short ? 6 : 12}>
      <Typography color="gray" sx={{ fontSize: "12px" }}>
        {label}
      </Typography>
      {value}
    </Grid>
  );
}

Datapoint.defaultProps = {
  short: false,
  mono: false,
};
