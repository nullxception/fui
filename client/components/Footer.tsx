import { useTRPC } from "@/query";
import { useQuery } from "@tanstack/react-query";
import React from "react";

export function Footer({
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  const rpc = useTRPC();

  const { data: sysinfo } = useQuery(rpc.sysInfo.queryOptions());

  return (
    <footer className={`mx-auto max-w-7xl px-8 py-4 text-center ${className}`}>
      <p className="text-xs text-gray-400">
        {sysinfo && (
          <>
            {[sysinfo.versions.app, sysinfo.versions.bun, sysinfo.versions.sd]
              .filter(Boolean)
              .join(", ")}
            <br />
          </>
        )}
        too much neovim, ai, and coffee
      </p>
    </footer>
  );
}
