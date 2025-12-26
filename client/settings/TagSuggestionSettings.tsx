import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTRPC } from "@/lib/query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CloudUploadIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import React, { useState } from "react";

function TagSuggestionSettings() {
  const [, setTags] = useState("");
  const rpc = useTRPC();
  const mutation = useMutation(
    rpc.tags.upload.mutationOptions({
      onError(error) {
        alert("Failed to update csv: " + error);
      },
      async onSettled(data) {
        if (data?.url) setTags(data?.url);
      },
    }),
  );

  const { data: status, refetch: refetchStatus } = useQuery(
    rpc.tags.status.queryOptions(undefined, {
      refetchInterval: (query) =>
        query.state.data?.loaded === 0 || mutation.isPending ? 300 : false,
    }),
  );

  const removeMutation = useMutation(
    rpc.tags.remove.mutationOptions({
      onSuccess() {
        refetchStatus();
      },
    }),
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("text/csv")) {
      alert("Please select a CSV file");
      return;
    }

    const data = new FormData();
    data.append("csv", file);
    mutation.mutate(data);
  };

  const isProcessing =
    mutation.isPending || status?.loaded === 0 || removeMutation.isPending;

  const total = status?.total ?? 0;

  return (
    <Card className="flex w-full flex-col gap-0 space-y-4 bg-background/60 p-4 backdrop-blur-xs">
      <h2 className="text-xs font-semibold uppercase">Tag Suggestion</h2>
      {!isProcessing && total > 0 && (
        <div className="flex items-center justify-between">
          <div>{total} tags loaded</div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="text-muted-foreground hover:text-destructive"
                title="Clear tags"
              >
                <Trash2Icon className="h-4 w-4" />
                Clear tags
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the uploaded tags.csv file and
                  clear all indexed tags.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => removeMutation.mutate()}
                >
                  Clear Tags
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <div>
        <input
          type="file"
          accept="text/*"
          onChange={handleFileUpload}
          className="hidden"
          id="tags-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="tags-upload"
          className={`flex cursor-pointer items-center justify-center gap-4 rounded-lg border-2 border-dashed p-4 text-muted-foreground transition-colors ${
            isProcessing
              ? "cursor-not-allowed text-primary"
              : "hover:bg-surface-hover hover:border-primary hover:text-foreground"
          }`}
        >
          {isProcessing ? (
            <>
              <LoaderCircleIcon className="animate-spin repeat-infinite" />
              Processing... {status?.total} tags
            </>
          ) : (
            <>
              <CloudUploadIcon />
              {total > 0 ? "Update" : "Upload"} tags.csv
            </>
          )}
        </label>
      </div>
    </Card>
  );
}
export default TagSuggestionSettings;
