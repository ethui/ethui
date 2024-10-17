import { Button } from "@ethui/ui/components/shadcn/button";

import { Link } from "@tanstack/react-router";
import type { StepProps } from ".";

export function WelcomeStep({ onSubmit }: StepProps) {
  return (
    <div className="m-3 flex w-full flex-col">
      <h1 className="self-start text-xl">Welcome</h1>

      <p>
        ethui is a toolkit for fullstack Ethereum development. Check out{" "}
        <Link
          href="https://ethui.dev"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          our website
        </Link>{" "}
        to learn more, or check out the&nbsp;
        <Link
          href="https://github.com/ethui/ethui"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          source code on Github
        </Link>
        .
        <br />
        Contributors are welcome!
      </p>
      <div className="self-end">
        <Button type="submit" onClick={onSubmit}>
          Next
        </Button>
      </div>
    </div>
  );
}
