import { useTRPC } from "@/lib/query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultUserConfig } from "server/defaults";
import type { AppSettings } from "server/types";

export function useSettings<K extends keyof AppSettings>(paramKey: K) {
  const rpc = useTRPC();
  const queryClient = useQueryClient();
  const defaultValue = defaultUserConfig().settings[paramKey];
  const { data } = useQuery(rpc.conf.settings.queryOptions(paramKey));
  const value = (data?.[paramKey] ?? defaultValue) as AppSettings[K];

  const mutation = useMutation(
    rpc.conf.saveSettings.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.conf.settings.queryKey(paramKey);
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.conf.settings.queryKey(paramKey);
        return queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  return {
    value,
    defaultValue,
    update: (newValue: AppSettings[K]) =>
      mutation.mutateAsync({ [paramKey]: newValue }),
  };
}
