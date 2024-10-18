import { Box, Button, Link } from "@mui/material";

import type { StepProps } from ".";

export function WelcomeStep({ onSubmit }: StepProps) {
  return (
    <div className="m-3 flex w-full flex-col">
      <span variant="h6" component="h1" alignSelf="start">
        Welcome
      </span>
      <p>
        ethui is a toolkit for fullstack Ethereum development. Check out{" "}
        <Link
          underline="hover"
          href="https://ethui.dev"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          our website
        </Link>{" "}
        to learn more, or check out the&nbsp;
        <Link
          underline="hover"
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
      <Box alignSelf="flex-end">
        <Button type="submit" onClick={onSubmit}>
          Next
        </Button>
      </Box>
    </div>
  );
}
