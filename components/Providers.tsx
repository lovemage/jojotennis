"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AppProvider } from "@/context/AppContext";
import ClientErrorBoundary from "@/components/ClientErrorBoundary";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ClientErrorBoundary>
        <AppProvider>{children}</AppProvider>
      </ClientErrorBoundary>
    </QueryClientProvider>
  );
}
