import { Checkbox, Label, Radio, TextInput } from "flowbite-react";
import { Fragment } from "react";
import {
  Control,
  Controller,
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  Path,
  UseFormRegister,
} from "react-hook-form";

type Error<T extends FieldValues> =
  | FieldError
  | Merge<FieldError, FieldErrorsImpl<T>>;

interface FieldTextProps<T extends FieldValues> {
  name: string;
  register: UseFormRegister<T>;
  field: Path<T>;
  value?: string | number;
  valueAsNumber?: boolean;
  error?: Error<T>;
}

export function FieldText<T extends FieldValues>({
  name,
  field,
  register,
  value,
  valueAsNumber,
  error,
}: FieldTextProps<T>) {
  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor={field} value={name} />
      </div>
      <TextInput
        type="text"
        {...register(field, { valueAsNumber })}
        defaultValue={value}
        color={error ? "failure" : "default"}
        helperText={
          error && (
            <Fragment>
              <span className="font-medium">{error.message?.toString()}</span>
            </Fragment>
          )
        }
      />
    </div>
  );
}

interface FieldRadioProps {
  name: string;
  control: Control<FieldValues, unknown>;
  values: Record<number, string>;
  defaultValue: string | number;
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
    <fieldset className="flex flex-col gap-4">
      <legend>{title}</legend>
      <Controller
        {...{ control, name, defaultValue }}
        render={({ field: { onChange, value, ...props } }) => (
          <>
            {Object.keys(values).map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Radio
                  {...props}
                  defaultChecked={i.toString() === value.toString()}
                  value={i}
                  onChange={(e) => onChange(parseInt(e.target.value, 10))}
                  className="radio checked:bg-red-500"
                />
                {/* <span className="label-text pl-2">{values[i]}</span> */}
                <Label key={i} className="label cursor-pointer justify-start">
                  {values[i]}
                </Label>
              </div>
            ))}
          </>
        )}
      />
    </fieldset>
  );
}

interface FieldCheckboxProps<T extends FieldValues> {
  name: string;
  field: Path<T>;
  register: UseFormRegister<T>;
}

export function FieldCheckbox<T extends FieldValues>({
  name,
  field,
  register,
}: FieldCheckboxProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={field} {...register(field)} />
      <Label htmlFor={field}>{name}</Label>
    </div>
  );
}
