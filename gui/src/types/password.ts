import { z } from "zod";
import zxcvbn from "zxcvbn-typescript";

export const passwordSchema = z.string().superRefine((password, ctx) => {
  const { feedback, score } = zxcvbn(password);

  if (score < 4) {
    const message =
      feedback.suggestions.length > 0
        ? feedback.suggestions.join(" ")
        : "Please use a stronger password.";

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
    });
  }
});

export const passwordFormSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "The two passwords don't match",
  });
