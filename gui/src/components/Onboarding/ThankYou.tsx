import { Button } from "@ethui/ui/components/shadcn/button";
import { Link } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

export function ThankYouStep() {
  useEffect(() => {
    invoke("settings_finish_onboarding");
  });

  return (
    <div className="m-3 flex w-full flex-col">
      <h1 className="self-start text-xl">Thank you</h1>

      <p>
        Thank you for using ethui. If you find any problems, please open an
        issue on GitHub.
      </p>

      <div className="self-end">
        <Link to="/home/account">
          <Button>Finish</Button>
        </Link>
      </div>
    </div>
  );
}
