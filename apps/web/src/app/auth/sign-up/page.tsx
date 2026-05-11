"use client";

import { FormControl } from "baseui/form-control";
import { Input } from "baseui/input";
import { Select } from "baseui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactElement, useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { MobileShell } from "@/components/mobile-shell";
import { authSignUp } from "@/lib/api/generated/client";
import type { SignUpDto } from "@/lib/api/generated/model/signUpDto";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { parseAuthResponseFromOrval } from "@/lib/auth/orval-auth-adapter";
import { calmPrimaryButtonClass, calmTextLinkClass } from "@/lib/calm-ui";
import { toast } from "@/lib/toast";

export default function SignUpPage(): ReactElement {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [regionId, setRegionId] = useState("");
  const genderOptions: { id: string; label: string }[] = [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
    { id: "other", label: "Other" }
  ];

  const signUpMutation = useMutation({
    mutationFn: (data: SignUpDto) => authSignUp(data, { signal: AbortSignal.timeout(60_000) }),
    onSuccess: (result) => {
      const parsed = parseAuthResponseFromOrval(result);
      setSession({
        user: parsed.user,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken
      });
      router.replace("/dashboard");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError
          ? (err.problem?.detail ?? err.message)
          : "Sign-up failed. Please review your details and try again.";
      toast.error(msg);
    }
  });

  return (
    <MobileShell title="Create account" subtitle="Set up your promoter profile and continue.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          signUpMutation.mutate({
            fullName,
            phone,
            gender,
            ...(regionId.length > 0 ? { regionId } : {})
          });
        }}
      >
        <FormControl label="Full name">
          <Input
            name="fullName"
            placeholder="Jamal Salim"
            value={fullName}
            onChange={(event) => {
              setFullName(event.currentTarget.value);
            }}
            required
          />
        </FormControl>

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

        <FormControl label="Gender">
          <Select
            options={genderOptions}
            value={genderOptions.filter((option) => option.id === gender)}
            clearable={false}
            searchable={false}
            onChange={(params) => {
              const option = params.value.at(0);
              if (option) {
                setGender(option.id as "male" | "female" | "other");
              }
            }}
          />
        </FormControl>

        <FormControl label="Region id (optional)">
          <Input
            name="regionId"
            placeholder="nairobi-west"
            value={regionId}
            onChange={(event) => {
              setRegionId(event.currentTarget.value);
            }}
          />
        </FormControl>

        <button
          type="submit"
          className={`${calmPrimaryButtonClass} mt-2`}
          disabled={signUpMutation.isPending}
        >
          {signUpMutation.isPending ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className={calmTextLinkClass}>
          Sign in
        </Link>
      </p>
    </MobileShell>
  );
}
