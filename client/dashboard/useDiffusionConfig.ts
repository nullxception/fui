import { useTRPC } from "@/query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultUserConfig } from "server/defaults";
import type { DiffusionParams } from "server/types";

export function useDiffusionConfig() {
  const rpc = useTRPC();
  const queryClient = useQueryClient();
  const defaults = defaultUserConfig().diffusion;
  const { data } = useQuery(
    rpc.diffusionParams.queryOptions(undefined, {
      placeholderData: defaults,
    }),
  );
  const params = data ?? defaults;

  const mutation = useMutation(
    rpc.saveDiffusionParams.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.diffusionParams.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.diffusionParams.queryKey();
        return queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  return {
    params,
    update: (
      key: keyof DiffusionParams,
      value: DiffusionParams[keyof DiffusionParams],
    ) => mutation.mutate({ ...params, [key]: value }),
    unset: (key: keyof DiffusionParams) =>
      mutation.mutate({ ...params, [key]: undefined }),
    updateAll: (partial: Partial<DiffusionParams>) =>
      mutation.mutateAsync({ ...params, ...partial }),
  };
}
