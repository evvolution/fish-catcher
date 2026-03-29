"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  className: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });

          router.push("/");
          router.refresh();
        });
      }}
    >
      {isPending ? "退出中..." : "退出登录"}
    </button>
  );
}
