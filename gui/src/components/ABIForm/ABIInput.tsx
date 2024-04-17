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
  const parsed2 = watch(`parsed.${name}`);

  const humanReadable: string =
    typeof type === "string" ? type : formatAbiParameter(omit(type, "name"));

  useEffect(() => {
    (async () => {
      let data;
      console.log("raw", raw);
      console.log(humanReadable);
      console.log(typeof type);

      // strings are used directly
      if (humanReadable === "string") {
        data = raw;

        // if array
      } else if (humanReadable.endsWith("[]")) {
        data = JSON.parse(`"${raw}"`);

        // if tuple
      } else if (humanReadable.startsWith("(") && humanReadable.endsWith(")")) {
        data = JSON.parse(`"${raw}"`);
      } else if (type === "string" || isNaN(parseInt(raw))) {
        data = JSON.parse(`"${raw}"`);
      } else {
        data = raw;
      }
      console.log(data);

      data = JSON.parse(
        JSON.stringify(data, (_k, v) =>
          ["number", "bigint"].includes(typeof v) ? `0x${v.toString(16)}` : v,
        ),
      );

      try {
        // TODO: replace this with a
        console.log(parsed, humanReadable);
        const parsed = await invoke<unknown>("abi_parse_argument", {
          data,
          type: humanReadable,
        });
        setValue(`parsed.${name}`, JSON.stringify(parsed));
      } catch (e: unknown) {
        setValue(`parsed.${name}`, null);
        setError(`raw.${name}`, {
          message: e instanceof Error ? e.message.toString() : "Unknown error",
        });
      }
    })();
  }, [raw, setValue, setError, name, humanReadable, type]);

  return (
    <>
      <Form.Text
        name={`raw.${name}`}
        label={`${label || name} (${humanReadable})`}
        fullWidth
        size="small"
      />
      {JSON.stringify(raw)}
      <br />
      {JSON.stringify(parsed2)}
    </>
  );
}
