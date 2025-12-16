import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { useMemo } from "react";

const limit = 20;

export function useImageQuery() {
  const rpc = useTRPC();
  const query = useInfiniteQuery(
    rpc.listImages.infiniteQueryOptions(
      { limit },
      {
        getNextPageParam(lastPage, _allPages, lastPageParam) {
          if (!lastPage) return null;
          if (lastPage.length >= limit) {
            return (lastPageParam ?? 0) + limit;
          }
          return null;
        },
      },
    ),
  );

  const images = useMemo(
    () => query.data?.pages.flatMap((x) => [...x]) || [],
    [query.data?.pages],
  );

  const queryClient = useQueryClient();

  const mutation = useMutation(
    rpc.removeImage.mutationOptions({
      onSuccess: async () => {
        const job = rpc.recentJob.queryKey("txt2img");
        const images = rpc.listImages.infiniteQueryKey();
        await queryClient.invalidateQueries({ queryKey: images });
        await queryClient.invalidateQueries({ queryKey: job });
      },
    }),
  );

  return {
    ...query,
    images,
    removeImages: (urls: string[]) => mutation.mutateAsync(urls),
  };
}
