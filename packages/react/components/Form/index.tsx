import {
  Button,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  StandardTextFieldProps,
  BaseSelectProps as MuiBaseSelectProps,
} from "@mui/material";
import {
  Controller,
  FieldPath,
  FieldPathValue,
  FieldValues,
  FormProvider,
  Path,
  SubmitHandler,
  UseFormReturn,
  useFormContext,
} from "react-hook-form";

interface Props<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: UseFormReturn<T>;
  children: React.ReactNode;
  onSubmit: SubmitHandler<T>;
}

export function Form<S extends FieldValues>({
  form,
  children,
  onSubmit,
  ...props
}: Props<S>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

interface BaseInputProps<T extends FieldValues> extends StandardTextFieldProps {
  label?: string;
  name: Path<T>;
}

function Text<T extends FieldValues>({
  name,
  label,
  ...props
}: BaseInputProps<T>) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <TextField
      label={label}
      {...register(name)}
      error={!!error}
      helperText={error?.message?.toString()}
      {...props}
    />
  );
}
Form.Text = Text;

function Number<T extends FieldValues>({
  name,
  label,
  ...props
}: BaseInputProps<T>) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <TextField
      label={label}
      {...register(name, { valueAsNumber: true })}
      type="number"
      error={!!error}
      helperText={error?.message?.toString()}
      {...props}
    />
  );
}
Form.Number = Number;

interface BigIntProps<T extends FieldValues> extends BaseInputProps<T> {
  decimals: number;
}

function BigIntField<T extends FieldValues>({
  name,
  label,
  decimals = 18,
  ...props
}: BigIntProps<T>) {
  const multiplier = 10n ** BigInt(decimals);
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          label={label}
          type="number"
          error={!!error}
          {...props}
          onChange={(e) => field.onChange(BigInt(e.target.value) * multiplier)}
          value={(BigInt(field.value) / multiplier).toString()}
        />
      )}
    />
  );
}
Form.BigInt = BigIntField;

function Checkbox<T extends FieldValues>({ name, label }: BaseInputProps<T>) {
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <FormControl error={!!error}>
      <FormGroup>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <FormControlLabel
              label={label}
              control={<Switch {...field} checked={field.value} />}
            />
          )}
        />
      </FormGroup>
      {error && <FormHelperText>{error?.message?.toString()}</FormHelperText>}
    </FormControl>
  );
}
Form.Checkbox = Checkbox;

interface SubmitProps {
  label: string;
}

function Submit({ label }: SubmitProps) {
  const {
    formState: { isValid, dirtyFields },
  } = useFormContext();
  // https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  return (
    <Button
      variant="contained"
      type="submit"
      disabled={!isDirtyAlt || !isValid}
    >
      {label}
    </Button>
  );
}
Form.Submit = Submit;

interface SelectProps<
  T extends FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
  Item extends { toString: () => string } = string,
> extends MuiBaseSelectProps {
  name: TName;
  label: string;
  defaultValue?: FieldPathValue<T, TName>;
  items: Item[];
  toValue?: (v: Item) => string;
  render?: (v: Item) => React.ReactNode;
  fullWidth?: boolean;
}

function SelectInput<
  T extends FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
  Item extends { toString: () => string } = string,
>({
  name,
  label,
  defaultValue,
  items,
  toValue = (v) => v.toString(),
  render = (v) => v.toString(),
  fullWidth = false,
  ...props
}: SelectProps<T, TName, Item>) {
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <FormControl fullWidth={fullWidth}>
      <InputLabel id={name}>{label}</InputLabel>
      <Controller
        name={name}
        defaultValue={defaultValue}
        control={control}
        render={({ field }) => (
          <Select
            aria-labelledby={name}
            size="small"
            label={label}
            {...field}
            {...props}
          >
            {items.map((v: Item) => (
              <MenuItem value={toValue(v)}>{render(v)}</MenuItem>
            ))}
          </Select>
        )}
      />
      {error && <FormHelperText>{error?.message?.toString()}</FormHelperText>}
    </FormControl>
  );
}
Form.Select = SelectInput;
