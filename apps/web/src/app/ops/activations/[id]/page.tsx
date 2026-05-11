"use client";

import { useParams } from "next/navigation";
import { type ReactElement } from "react";

import { ActivationDetailView } from "../activation-detail-view";

export default function OpsActivationDetailPage(): ReactElement {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return <ActivationDetailView activationId={id} />;
}
