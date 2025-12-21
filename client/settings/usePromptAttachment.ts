import { useTRPC } from "@/lib/query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { optimizePrompt } from "server/lib/metadataParser";
import type { PromptAttachment, PromptAttachmentType } from "server/types";

export function usePromptAttachment() {
  const rpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isFetched } = useQuery(
    rpc.conf.promptAttachments.queryOptions(),
  );

  const mutation = useMutation(
    rpc.conf.savePromptAttachments.mutationOptions({
      onMutate: async (newConf) => {
        const queryKey = rpc.conf.promptAttachments.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const lastConf = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, newConf);
        return { lastConf, newConf };
      },
      onSettled: () => {
        const queryKey = rpc.conf.promptAttachments.queryKey();
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

      return optimizePrompt(prompt, undefined, {
        type,
        target: filename,
        words: match?.words ?? [],
        strength: match?.strength ?? 1,
      });
    },
  };
}
