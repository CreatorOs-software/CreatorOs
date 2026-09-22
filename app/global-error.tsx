"use client";

import { ErrorFallback } from "@/components/errors/error-fallback";

export default function GlobalError(props: React.ComponentProps<typeof ErrorFallback>) {
  return (
    <html lang="de">
      <body>
        <ErrorFallback {...props} />
      </body>
    </html>
  );
}
