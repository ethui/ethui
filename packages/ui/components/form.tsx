import {
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type Path,
  type SubmitHandler,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form";

import clsx from "clsx";
import { Button, type ButtonProps } from "./shadcn/button";
import { Checkbox as ShadCheckbox } from "./shadcn/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form as ShadForm,
} from "./shadcn/form";
import { Input, type InputProps } from "./shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./shadcn/select";
import { Textarea as ShadTextarea } from "./shadcn/textarea";

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
  className,
  ...props
}: Props<S>) {
  return (
    <ShadForm {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={clsx(
          "flex flex-col items-start gap-5 align-start",
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </ShadForm>
  );
}

interface BaseInputProps<T extends FieldValues> extends InputProps {
  label?: string;
  name: Path<T>;
  type?: string;
  className?: string;
}

function Text<T extends FieldValues>({
  name,
  label,
  type = "text",
  className = "",
}: BaseInputProps<T>) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} type={type} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.Text = Text;

function Textarea<T extends FieldValues>({
  name,
  label,
  className = "",
}: BaseInputProps<T>) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <ShadTextarea {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.Textarea = Textarea;

function NumberField<T extends FieldValues>({
  name,
  label,
}: BaseInputProps<T>) {
  const { register, control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {/* TODO: maybe we should use zod's coerce instead? https://github.com/shadcn-ui/ui/issues/421 */}
            <Input type="number" {...register(name, { valueAsNumber: true })} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.NumberField = NumberField;

interface BigIntProps<T extends FieldValues> extends BaseInputProps<T> {
  decimals: number;
}

function BigIntField<T extends FieldValues>({
  name,
  label,
  decimals = 18,
}: BigIntProps<T>) {
  const multiplier = 10n ** BigInt(decimals);
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {/* TODO: maybe we should use zod's coerce instead? https://github.com/shadcn-ui/ui/issues/421 */}
            <Input
              type="number"
              {...field}
              onChange={(e) =>
                field.onChange(BigInt(e.target.value) * multiplier)
              }
              value={(BigInt(field.value) / multiplier).toString()}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.BigInt = BigIntField;

function Checkbox<T extends FieldValues>({ name, label }: BaseInputProps<T>) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            {/* TODO: maybe we should use zod's coerce instead? https://github.com/shadcn-ui/ui/issues/421 */}

            <ShadCheckbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="cursor-pointer">{label}</FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.Checkbox = Checkbox;

interface SubmitProps extends ButtonProps {
  label: React.ReactNode;
  useDirtyAlt?: boolean;
}

function Submit({
  label,
  // this arg was kept here and defaulted to true for backwards compatibility,
  // need to double check if the issue linked above is still required (for cases where array fields are present)
  useDirtyAlt = true,
  ...props
}: SubmitProps) {
  const {
    formState: { isValid, dirtyFields },
  } = useFormContext();
  // https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = useDirtyAlt && !!Object.keys(dirtyFields).length;

  return (
    <Button type="submit" disabled={!isDirtyAlt && !isValid} {...props}>
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
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-baseline gap-2">
          <FormLabel className="shrink-0">{label}</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value || defaultValue}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a verified email to display" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((v: Item) => (
                <SelectItem key={toValue(v)} value={toValue(v)}>
                  {render(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
Form.Select = SelectInput;
