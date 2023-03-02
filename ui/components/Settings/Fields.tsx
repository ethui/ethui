import React from "react";
import { Controller, FieldError } from "react-hook-form";

interface FieldTextProps {
  name: string;
  register: any;
  value: string;
  error: FieldError | undefined;
}

export function FieldText({ name, register, value, error }: FieldTextProps) {
  return (
    <div className="form-control w-full m-2">
      <label className="label">
        <span className="label-text">{name}</span>
      </label>
      <input
        type="text"
        {...register}
        defaultValue={value}
        className="input input-bordered w-full"
      />
      {error && <p>&#9888; {error.message} </p>}
    </div>
  );
}

interface FieldRadioProps {
  name: string;
  control: any;
  register: any;
  values: any[];
  defaultValue: any;
  error: FieldError | undefined;
}

// TODO: currently assumes radio groups are number fields
export function FieldRadio({
  name,
  control,
  values,
  defaultValue,
  error,
}: FieldRadioProps) {
  return (
    <div className="form-control w-full m-2">
      <Controller
        {...{ control, name, defaultValue }}
        render={({ field: { onChange, ...props } }) => (
          <>
            {values.map((value) => (
              <label className="label cursor-pointer justify-start">
                <input
                  type="radio"
                  {...props}
                  checked={value === props.value}
                  value={value}
                  onChange={(e) => onChange(parseInt(e.target.value, 10))}
                  className="radio checked:bg-red-500"
                />
                <span className="label-text pl-2">{value}</span>
              </label>
            ))}
            {error && <p>&#9888; {error.message} </p>}
          </>
        )}
      />
    </div>
  );
}
