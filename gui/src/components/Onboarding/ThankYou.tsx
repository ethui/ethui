import { Button } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

export function ThankYouStep() {
  useEffect(() => {
    invoke("settings_finish_onboarding");
  });

  return (
    <div className="m-3 flex w-full flex-col">
      <span variant="h6" component="h1" alignSelf="start">
        Thank you
      </span>
      <p>
        Thank you for using ethui. If you find any problems, please open an
        issue on GitHub.
      </p>

      <div alignSelf="flex-end">
        <Link to="/home/account">
          <Button>Finish</Button>
        </Link>
      </div>
    </div>
  );
}
