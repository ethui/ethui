import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { type AbiParameter } from "abitype";

import { parse } from "./parser";

export interface ABIInputProps {
  name: string;
  label?: string;
  type: AbiParameter | string;
}

export function ABIInput({ name, label, type }: ABIInputProps) {
  const { watch, setValue, setError, register } = useFormContext();
  const raw = watch(`raw.${name}`);

  let humanReadable = type;
  if (typeof humanReadable === "object") {
    delete humanReadable.name;
  }

  useEffect(() => {
    (async () => {
      try {
        // TODO: replace this with a
        setValue(`parsed.${name}`, parse(raw));
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
      asd
      {label || name} ({humanReadable})
      <input {...register(name)} />
    </>
  );
}
