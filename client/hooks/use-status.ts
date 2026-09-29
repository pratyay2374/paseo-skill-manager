// The status payload. Paseo has no server push, so the page refetches after
// every write and polls while the daemon is still resolving registry figures.
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { describeError } from "../lib/format";
import type { Api } from "../lib/types";

const POLL_MS = 2_500;

export function useStatus(api: Api) {
  const query = useQuery({
    queryKey: ["skill-manager", "status"],
    queryFn: () => api.status({}),
    refetchInterval: (current) => (current.state.data?.enriching === true ? POLL_MS : false),
  });
  const { refetch } = query;
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);
  return {
    status: query.data ?? null,
    error: query.error !== null ? describeError(query.error) : null,
    refetch: refresh,
  };
}
