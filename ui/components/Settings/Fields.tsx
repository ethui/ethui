import React from "react";
import {
  Controller,
  FieldError,
  FieldErrorsImpl,
  Merge,
} from "react-hook-form";

type Error = FieldError | Merge<FieldError, FieldErrorsImpl<any>>;

interface FieldTextProps {
  name: string;
  register: any;
  field: string;
  value?: string | number;
  valueAsNumber?: boolean;
  error?: any;
}

export function FieldText({
  name,
  field,
  register,
  value,
  valueAsNumber,
  error,
}: FieldTextProps) {
  return (
    <div className="form-control w-full px-2">
      <label className="label">
        <span className="label-text">{name}</span>
      </label>
      <input
        type="text"
        {...register(field, { valueAsNumber })}
        defaultValue={value}
        className="input input-bordered w-full"
      />

      {error && <p className="text-red-600">{error.message?.toString()}</p>}
    </div>
  );
}

interface FieldRadioProps {
  name: string;
  control: any;
  values: Record<number, string>;
  defaultValue: any;
  title: string;
}

// TODO: currently assumes radio groups are number fields
export function FieldRadio({
  name,
  control,
  values,
  defaultValue,
  title,
}: FieldRadioProps) {
  return (
    <div className="form-control w-full m-2">
      <label className="label">
        <span className="label-text">{title}</span>
      </label>
      <Controller
        {...{ control, name, defaultValue }}
        render={({ field: { onChange, value, ...props } }) => (
          <>
            {Object.keys(values).map((i) => (
              <label key={i} className="label cursor-pointer justify-start">
                <input
                  type="radio"
                  {...props}
                  checked={i.toString() === value.toString()}
                  value={i}
                  onChange={(e) => onChange(parseInt(e.target.value, 10))}
                  className="radio checked:bg-red-500"
                />
                <span className="label-text pl-2">{values[i]}</span>
              </label>
            ))}
          </>
        )}
      />
    </div>
  );
}
