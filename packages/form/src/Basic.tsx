import { useEffect, useState } from "react";
import { parse } from "./parser";
import { TextField } from "@mui/material";
import { BasicProps, stringify } from "./ABIForm";

export function Basic({ name, type, onChange }: BasicProps) {
  const [value, setValue] = useState(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(parse(e.target.value));
  };

  useEffect(() => onChange(value), [value]);

  return (
    <div>
      {type}
      <br />
      <TextField onChange={handleChange} />
      <br />
      <Typography>parsed: {stringify(value)}</Typography>
    </div>
  );
}
