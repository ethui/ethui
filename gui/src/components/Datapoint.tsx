import { Skeleton } from "@mui/material";

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
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      {value !== undefined && value}
      {value === undefined && <Skeleton variant="text" width="80%" />}
    </div>
  );
}
