import { TextField } from "@mui/material";
import { useFormContext } from "react-hook-form";

export interface ABIInputProps {
  name: string;
  type: string;
}

export function ABIInput({ name, type }: ABIInputProps) {
  const { register } = useFormContext();

  return (
    <TextField
      sx={{ minWidth: 300 }}
      size="small"
      {...register(`args.${name}`)}
      label={`${name} (${type})`}
    />
  );
}

function isArray(type: string): boolean {
  return type.endsWith("[]");
}
