import React from "react";
import { FieldError } from "react-hook-form";

interface FormControlProps {
  name: string;
  register: any;
  value: string;
  error: FieldError | undefined;
}

export function FormControl({
  name,
  register,
  value,
  error,
}: FormControlProps) {
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
