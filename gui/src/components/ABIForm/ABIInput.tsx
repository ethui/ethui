import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { invoke } from "@tauri-apps/api";
import { formatAbiParameter, type AbiParameter } from "abitype";
import omit from "lodash-es/omit";

import { Form } from "@ethui/react/components";

export interface ABIInputProps {
  name: string | number;
  label?: string;
  type: AbiParameter | string;
}

export function ABIInput({ name, label, type }: ABIInputProps) {
  const { watch, setValue, setError } = useFormContext();
  const raw = watch(`raw.${name}`);

  const humanReadableType: string =
    typeof type === "string" ? type : formatAbiParameter(omit(type, "name"));

  useEffect(() => {
    (async () => {
      try {
        const parsed = await parse(raw, humanReadableType);
        setValue(`parsed.${name}`, parsed);
      } catch (e: unknown) {
        setValue(`parsed.${name}`, null);
        setError(`raw.${name}`, {
          message: e instanceof Error ? e.message.toString() : "Unknown error",
        });
      }
    })();
  }, [raw, setValue, setError, name, humanReadableType, type]);

  return (
    <Form.Text
      name={`raw.${name}`}
      label={`${label || name} (${humanReadableType})`}
      fullWidth
      size="small"
    />
  );
}

async function parse(raw: string, type: string) {
  let data;
  try {
    data = JSON.parse(`${raw}`);
  } catch (e) {
    data = JSON.parse(`"${raw}"`);
  }

  // convert each numeric value to hex to prevent floating point conversion issues with JS stringification
  data = JSON.parse(
    JSON.stringify(data, (_k, v) =>
      ["number", "bigint"].includes(typeof v) ? `0x${v.toString(16)}` : v,
    ),
  );

  const parsed = await invoke<unknown>("abi_parse_argument", {
    data,
    type,
  });

  return JSON.stringify(parsed);
}
