import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "client/query";
import { optimizePrompt } from "server/lib/metadataParser";
import type { PromptAttachment, PromptAttachmentType } from "server/types";

export function usePromptAttachment() {
  const rpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isFetched } = useQuery(rpc.promptAttachment.queryOptions());

  const mutation = useMutation(
    rpc.savePromptAttachment.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.promptAttachment.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.promptAttachment.queryKey();
        return queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  return {
    promptAttachment: data,
    addTW: (word: PromptAttachment) => {
      if (!isFetched) return;
      mutation.mutate(data ? [...data, word] : [word]);
    },
    updateTW: (index: number, word: PromptAttachment) => {
      if (!isFetched) return;
      const newWords = data ? [...data] : [];
      newWords[index] = word;
      mutation.mutate(newWords);
    },
    deleteTW: (index: number) => {
      if (!isFetched) return;
      if (data) mutation.mutate(data.filter((_, i) => i !== index));
    },
    buildPrompt(
      prompt: string | undefined,
      filename: string,
      type: PromptAttachmentType,
    ) {
      // Find matching attachment for this embedding/lora
      const match = data?.find(
        (tw) => tw.type === type && tw.target.startsWith(filename),
      );
      const words = match?.words ?? [];
      const name = filename.replace(/\.(safetensors|ckpt)$/, "");
      const strength = match?.strength || 1;
      const embed =
        type === "lora" ? `<lora:${name}:${strength}>` : `embedding:${name}`;

      return optimizePrompt([embed, ...words, prompt].join(","));
    },
  };
}
