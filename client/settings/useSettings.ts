import { useTRPC } from "@/query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultUserConfig } from "server/defaults";
import type { AppSettings } from "server/types";

export function useSettings() {
  const rpc = useTRPC();
  const queryClient = useQueryClient();
  const defaults = defaultUserConfig().settings;
  const { data } = useQuery(
    rpc.settings.queryOptions(undefined, {
      placeholderData: defaults,
    }),
  );
  const settings = data ?? defaults;

  const mutation = useMutation(
    rpc.saveSettings.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.settings.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.settings.queryKey();
        return queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  return {
    settings,
    update: (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) =>
      mutation.mutate({ ...settings, [key]: value }),
    updateAll: (partial: Partial<AppSettings>) =>
      mutation.mutate({ ...settings, ...partial }),
  };
}
