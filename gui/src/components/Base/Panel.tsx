import React from "react";
import { ReactNode } from "react";

export default function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white shadow container min-h-[200px] py-4">
      {children}
    </div>
  );
}
