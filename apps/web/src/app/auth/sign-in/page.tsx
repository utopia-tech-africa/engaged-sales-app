"use client";

import { FormControl } from "baseui/form-control";
import { Input } from "baseui/input";
import { Select } from "baseui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { useAuthSignIn } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseAuthResponseFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass, calmTextLinkClass } from "@/lib/calm-ui";

export default function SignInPage(): ReactElement {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [role, setRole] = useState<"promoter" | "merchandizer" | "supervisor" | "admin">(
    "promoter"
  );
  const roleOptions: { id: string; label: string }[] = [
    { id: "promoter", label: "Promoter" },
    { id: "merchandizer", label: "Merchandizer" },
    { id: "supervisor", label: "Supervisor" },
    { id: "admin", label: "Admin" }
  ];

  const signInMutation = useAuthSignIn({
    mutation: {
      onSuccess: (result) => {
        const parsed = parseAuthResponseFromOrval(result);
        setSession({
          user: parsed.user,
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken
        });
        router.replace("/dashboard");
      }
    }
  });

  return (
    <MobileShell title="Sign in" subtitle="Enter your phone, unique code, and role.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          signInMutation.mutate({ data: { phone, uniqueCode, role } });
        }}
      >
        <FormControl label="Phone number">
          <Input
            name="phone"
            placeholder="+254712345678"
            value={phone}
            onChange={(event) => {
              setPhone(event.currentTarget.value);
            }}
            required
          />
        </FormControl>

        <FormControl label="Unique code">
          <Input
            name="uniqueCode"
            placeholder="P-12ab34cd"
            value={uniqueCode}
            onChange={(event) => {
              setUniqueCode(event.currentTarget.value);
            }}
            required
          />
        </FormControl>

        <FormControl label="Role">
          <Select
            options={roleOptions}
            value={roleOptions.filter((option) => option.id === role)}
            clearable={false}
            searchable={false}
            onChange={(params) => {
              const option = params.value.at(0);
              if (option) {
                setRole(option.id as "promoter" | "merchandizer" | "supervisor" | "admin");
              }
            }}
          />
        </FormControl>

        {signInMutation.isError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            Sign-in failed. Please check your credentials and try again.
          </p>
        ) : null}

        <button
          type="submit"
          className={`${calmPrimaryButtonClass} mt-2`}
          disabled={signInMutation.isPending}
        >
          {signInMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/auth/sign-up" className={calmTextLinkClass}>
          Create account
        </Link>
      </p>
    </MobileShell>
  );
}
