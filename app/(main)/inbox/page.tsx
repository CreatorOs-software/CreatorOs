"use client";

import { Suspense } from "react";
import { OrbitInbox } from "@/components/inbox/orbit-inbox";

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <OrbitInbox />
    </Suspense>
  );
}
