import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { optimizePrompt } from "server/lib/metadataParser";
import type { ExtraDataType, TriggerWord } from "server/types";

export function useTriggerWords() {
  const rpc = useTRPC();
  const queryClient = useQueryClient();

  const { data } = useQuery(
    rpc.triggerWords.queryOptions(undefined, {
      placeholderData: [] as TriggerWord[],
    }),
  );
  const triggerWords = data ?? [];

  const mutation = useMutation(
    rpc.saveTriggerWords.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.triggerWords.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.triggerWords.queryKey();
        return queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  return {
    triggerWords,
    addTW: (word: TriggerWord) => {
      mutation.mutate([...triggerWords, word]);
    },
    updateTW: (index: number, word: TriggerWord) => {
      const newWords = [...triggerWords];
      newWords[index] = word;
      mutation.mutate(newWords);
    },
    deleteTW: (index: number) => {
      mutation.mutate(triggerWords.filter((_, i) => i !== index));
    },
    buildPrompt(
      prompt: string | undefined,
      filename: string,
      type: ExtraDataType,
    ) {
      // Find matching trigger words for this embedding/lora
      const match = triggerWords?.find(
        (tw) => tw.type === type && tw.target.startsWith(filename),
      );
      const words = match?.words ?? [];
      const name = filename.replace(/\.(safetensors|ckpt)$/, "");
      const strength = match?.loraStrength || 1;
      const embed =
        type === "lora" ? `<lora:${name}:${strength}>` : `embedding:${name}`;

      return optimizePrompt([embed, ...words, prompt].join(","));
    },
  };
}
