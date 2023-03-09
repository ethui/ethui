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
