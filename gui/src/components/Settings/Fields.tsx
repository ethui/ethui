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
        <label className="text-sm font-medium text-gray-900" htmlFor={field}>
          {name}
        </label>
      </div>
      <input
        className="block w-full border disabled:cursor-not-allowed disabled:opacity-50 rounded-lg p-2.5 text-sm"
        type="text"
        {...register(field, { valueAsNumber })}
        defaultValue={value}
        color={error ? "failure" : "default"}
      />
      {error && (
        <span className="mt-2 text-sm text-red-600">
          {error.message?.toString()}
        </span>
      )}
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
                <input
                  type="radio"
                  className="h-4 w-4 border border-gray-300 focus:ring-2 focus:ring-blue-500 radio"
                  {...props}
                  id={i}
                  defaultChecked={i.toString() === value.toString()}
                  value={i}
                  onChange={(e) => onChange(parseInt(e.target.value, 10))}
                />
                {/* <span className="label-text pl-2">{values[i]}</span> */}
                <label
                  key={i}
                  className="label cursor-pointer justify-start"
                  htmlFor={i}
                >
                  {values[Number(i)]}
                </label>
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
      <input
        type="checkbox"
        className="h-4 w-4 rounded border border-gray-300 bg-gray-100"
        id={field}
        {...register(field)}
      />
      <label className="text-sm font-medium text-gray-900" htmlFor={field}>
        {name}
      </label>
    </div>
  );
}
