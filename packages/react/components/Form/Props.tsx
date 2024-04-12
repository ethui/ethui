import { SubmitHandler, UseFormReturn } from "react-hook-form";

export interface Props<T extends FieldValues>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: UseFormReturn<T>;
  children: React.ReactElement | React.ReactElement[];
  onSubmit: SubmitHandler<T>;
}

