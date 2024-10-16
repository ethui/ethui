import { Grid2 as Grid, Skeleton, Typography } from "@mui/material";

interface DatapointProps {
  label: string;
  value?: React.ReactNode | string;
  size?: "large" | "medium" | "small";
}

export function Datapoint({ label, value, size = "large" }: DatapointProps) {
  let xs = 12;
  if (size === "medium") {
    xs = 6;
  } else if (size === "small") {
    xs = 4;
  }
  return (
    <Grid size={{ xs }}>
      <Typography sx={{ color: "gray", fontSize: "12px" }}>{label}</Typography>
      {value !== undefined && value}
      {value === undefined && <Skeleton variant="text" width="80%" />}
    </Grid>
  );
}
