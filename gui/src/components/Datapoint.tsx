import { Skeleton } from "@mui/material";
import { clsx } from "clsx";

interface DatapointProps {
  label: string;
  value?: React.ReactNode | string;
  className?: string;
}

export function Datapoint({ label, value, className }: DatapointProps) {
  return (
    <div className={clsx("flex flex-col", className)}>
      <span className="text-muted-foreground">{label}</span>
      {value !== undefined && value}
      {value === undefined && <Skeleton variant="text" width="80%" />}
    </div>
  );
}
