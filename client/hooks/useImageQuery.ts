import { usePreviewImage } from "@/hooks/usePreviewImage";
import { useTRPC } from "@/lib/query";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

const limit = 20;

export function useImageQuery() {
  const rpc = useTRPC();
  const query = useInfiniteQuery(
    rpc.images.byPage.infiniteQueryOptions(
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
    rpc.images.remove.mutationOptions({
      onSuccess: async () => {
        const job = rpc.info.lastJob.queryKey("txt2img");
        const images = rpc.images.byPage.infiniteQueryKey();
        await queryClient.invalidateQueries({ queryKey: images });
        await queryClient.invalidateQueries({ queryKey: job });
      },
    }),
  );

  return {
    ...query,
    images,
    removeImages: async (urls: string[]) => {
      await mutation.mutateAsync(urls);
      usePreviewImage.getState().remove(urls);
    },
  };
}
