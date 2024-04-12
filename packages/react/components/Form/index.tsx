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

interface BaseInputProps<T extends FieldValues> {
  label?: string;
  name: Path<T>;
  autoFocus?: boolean;
  fullWidth?: boolean;
}

function Text<T extends FieldValues>({
  name,
  label,
  fullWidth = false,
}: BaseInputProps<T>) {
  const { register, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <TextField
      label={label}
      {...register(name)}
      error={!!error}
      helperText={error?.message?.toString()}
      fullWidth={fullWidth}
    />
  );
}
Form.Text = Text;

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
> {
  name: TName;
  label: string;
  defaultValue?: FieldPathValue<T, TName>;
  items: Item[];
  toValue?: (v: Item) => string;
  render?: (v: Item) => React.ReactNode;
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
}: SelectProps<T, TName, Item>) {
  const { control, formState } = useFormContext();
  const error = formState.errors[name];

  return (
    <FormControl>
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
            sx={{ minWidth: 120 }}
            {...field}
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
