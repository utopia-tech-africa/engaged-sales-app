"use client";

import { FormControl } from "baseui/form-control";
import { Input } from "baseui/input";
import { Select } from "baseui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { useAuthSignIn } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseAuthResponseFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass, calmTextLinkClass } from "@/lib/calm-ui";
import { isOpsRole } from "@/lib/ops/ops-adapters";

export default function SignInPage(): ReactElement {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [role, setRole] = useState<"promoter" | "merchandizer" | "supervisor" | "admin">(
    "promoter"
  );
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
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
        router.replace(isOpsRole(parsed.user.role) ? "/ops" : "/dashboard");
      }
    }
  });

  const signInErrorUnknown: unknown = signInMutation.error;
  const apiErrorMessage =
    signInErrorUnknown instanceof ApiError
      ? (signInErrorUnknown.problem?.detail ?? signInErrorUnknown.message)
      : "Sign-in failed. Please check your credentials and try again.";

  return (
    <MobileShell
      title="Sign in"
      subtitle="Enter your phone, unique code, and role. Location is read when you sign in so we can enforce your organization’s work area when it is configured."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setGeoError(null);
          setIsLocating(true);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              signInMutation.mutate(
                {
                  data: {
                    phone,
                    uniqueCode,
                    role,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                  }
                },
                {
                  onSettled: () => {
                    setIsLocating(false);
                  }
                }
              );
            },
            (error) => {
              setIsLocating(false);
              setGeoError(error.message || "Could not read your location.");
            },
            { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 }
          );
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

        {geoError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {geoError}
          </p>
        ) : null}

        {signInMutation.isError && !geoError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {apiErrorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className={`${calmPrimaryButtonClass} mt-2`}
          disabled={isLocating || signInMutation.isPending}
        >
          {isLocating || signInMutation.isPending ? "Signing in..." : "Sign in"}
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
