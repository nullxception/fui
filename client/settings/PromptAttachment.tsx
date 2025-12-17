import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/query";
import { useQuery } from "@tanstack/react-query";
import {
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import React, { useState } from "react";
import { splitSmart } from "server/lib/metadataParser";
import type { PromptAttachment, PromptAttachmentType } from "server/types";
import { promptAttachmentTypeSchema } from "server/types/promptAttachment";
import { usePromptAttachment } from "./usePromptAttachment";

interface PromptAttachmentFormProps {
  isEditing?: boolean;
  entry: PromptAttachment;
  onChange: ({
    entry,
    save,
  }: {
    entry: PromptAttachment;
    save?: boolean;
  }) => void;
  availableTargets: string[];
  onSave: () => void;
  onCancel: () => void;
}

function PromptAttachmentForm({
  isEditing = false,
  entry,
  onChange,
  availableTargets,
  onSave,
  onCancel,
}: PromptAttachmentFormProps) {
  const [wordInput, setWordInput] = useState("");
  const newWords = splitSmart(wordInput);

  const handleAddWord = () => {
    if (newWords.length > 0) {
      onChange({ entry: { ...entry, words: [...entry.words, ...newWords] } });
      setWordInput("");
    }
  };

  const handleRemoveWord = (index: number) => {
    onChange({
      entry: { ...entry, words: entry.words.filter((_, i) => i !== index) },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddWord();
    }
  };

  const handleStrengthChange = (value: number) => {
    if (value > 1) value = 1;
    onChange({ entry: { ...entry, strength: value } });
  };

  const loraStrength = entry.strength ?? 1;
  const typeLabel = entry.type === "lora" ? "LoRA" : "Embedding";

  const isSaveable = () => {
    if (!entry.target) return false;
    const hasWords = entry.words.length > 0 || newWords.length > 0;
    if (entry.type === "embedding" && !hasWords) return false;
    if (entry.type === "lora") {
      if (!hasWords && loraStrength >= 1) return false;
    }
    return true;
  };

  const handleOnSave = () => {
    if (newWords.length > 0) {
      onChange({
        entry: { ...entry, words: [...entry.words, ...newWords] },
        save: true,
      });
    } else {
      onSave();
    }
  };

  return (
    <div className="space-y-3">
      {isEditing ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs ${
                entry.type === "embedding"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-purple-500/20 text-purple-300"
              }`}
            >
              {entry.type === "lora" ? "LoRA" : "Embedding"}
            </span>
            <span className="text-xs">{entry.target}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-3">
          <Select
            value={entry.type}
            onValueChange={(e) =>
              onChange({
                entry: {
                  ...entry,
                  type: promptAttachmentTypeSchema.parse(e),
                  target: "", // Reset target when type changes
                },
              })
            }
          >
            <SelectTrigger className="shrink-0">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="embedding">Embedding</SelectItem>
                <SelectItem value="lora">LoRA</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={entry.target}
            onValueChange={(e) => onChange({ entry: { ...entry, target: e } })}
          >
            <SelectTrigger className="grow overflow-hidden">
              <SelectValue placeholder={`Select ${typeLabel}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select {entry.type}</SelectLabel>
                {availableTargets.map((target) => (
                  <SelectItem key={target} value={target}>
                    {target}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {entry.words.map((word, index) => (
          <span
            key={index}
            className="bg-surface-hover flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
          >
            {word}
            <button
              onClick={() => handleRemoveWord(index)}
              className="hover:text-red-400"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mb-2 flex gap-2">
        <InputGroup>
          <InputGroupInput
            name="wordListInsert"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add some word"
            className="flex-1"
          />
          <InputGroupButton onClick={handleAddWord}>
            <PlusIcon />
          </InputGroupButton>
        </InputGroup>
      </div>
      {entry.type === "lora" && (
        <div className="flex justify-end gap-4 pt-2">
          <Label htmlFor="loraStrengthNumber">Strength</Label>
          <InputGroup className="w-30">
            <InputGroupButton
              onClick={() => handleStrengthChange(loraStrength - 0.1)}
            >
              <MinusIcon />
            </InputGroupButton>
            <InputGroupInput
              id="loraStrengthNumber"
              type="number"
              min={0}
              max={1}
              inputMode="numeric"
              pattern="[0-9+-.]+"
              step={0.01}
              value={loraStrength}
              onChange={(e) => {
                handleStrengthChange(e.target.valueAsNumber);
              }}
              placeholder="1"
              className="w-15 text-center"
            />
            <InputGroupButton
              onClick={() => handleStrengthChange(loraStrength + 0.1)}
            >
              <PlusIcon />
            </InputGroupButton>
          </InputGroup>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
        <Button
          onClick={handleOnSave}
          variant="default"
          size="sm"
          disabled={!isSaveable()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export function PromptAttachmentEditor() {
  const { promptAttachment, addTW, updateTW, deleteTW } = usePromptAttachment();
  const rpc = useTRPC();
  const { data } = useQuery(rpc.listModels.queryOptions());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<PromptAttachment | null>(
    null,
  );
  const [newEntry, setNewEntry] = useState<PromptAttachment | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null,
  );

  const handleAdd = () => {
    setNewEntry({
      type: "embedding",
      target: "",
      words: [],
    });
  };

  const normalizeFP = (num?: number) => {
    let t = num?.toString() || "1";
    t = t.indexOf(".") >= 0 ? t.slice(0, t.indexOf(".") + 3) : t;
    return Number(t);
  };

  const saveNewEntry = (entry: PromptAttachment | null) => {
    if (!entry) return;
    const loraStrength = entry.strength ?? 1;
    const isSaveable = entry.words.length > 0 || loraStrength < 1;
    if (entry && entry.target && isSaveable) {
      let tw = entry;
      if (loraStrength < 1) {
        tw = {
          ...entry,
          strength: normalizeFP(entry.strength),
        };
      }
      addTW(tw);
      setNewEntry(null);
    }
  };

  const handleSaveNew = () => {
    saveNewEntry(newEntry);
  };

  const handleCancelNew = () => {
    setNewEntry(null);
  };

  const handleDelete = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const confirmDelete = () => {
    if (deleteConfirmIndex !== null) {
      deleteTW(deleteConfirmIndex);
      setDeleteConfirmIndex(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmIndex(null);
  };

  const handleEdit = (index: number) => {
    const entry = promptAttachment?.[index];
    if (entry) {
      setEditingIndex(index);
      setEditingEntry(entry);
    }
  };

  const handleSaveEdit = (index: number, updated: PromptAttachment) => {
    let tw = updated;
    const loraStrength = updated.strength ?? 1;

    if (loraStrength < 1) {
      tw = {
        ...updated,
        strength: normalizeFP(updated.strength),
      };
    }
    updateTW(index, tw);
    setEditingIndex(null);
    setEditingEntry(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingEntry(null);
  };

  const getAvailableTargets = (type: PromptAttachmentType) => {
    if (!data) return [];

    return type === "embedding" ? data.embeddings : data.loras;
  };

  return (
    <>
      <Card className="col-span-1 row-span-1 flex flex-row items-center justify-between bg-background/60 px-4 py-2 backdrop-blur-sm md:col-span-2">
        <h2>Prompt Attachment</h2>
        <Button
          onClick={handleAdd}
          variant="outline"
          size="sm"
          disabled={newEntry !== null}
        >
          <PlusIcon />
          Add Entry
        </Button>
      </Card>

      {/* New Entry Form */}
      {newEntry && (
        <Card className="col-span-1 border border-primary bg-background/60 p-4 backdrop-blur-sm md:col-span-2">
          <PromptAttachmentForm
            entry={newEntry}
            onChange={(data) => {
              if (data?.save) {
                saveNewEntry(data.entry);
              } else {
                setNewEntry(data.entry);
              }
            }}
            availableTargets={getAvailableTargets(newEntry.type)}
            onSave={handleSaveNew}
            onCancel={handleCancelNew}
          />
        </Card>
      )}

      {/* Existing Entries */}
      <>
        {promptAttachment?.map((entry, index) => (
          <div key={index}>
            <Card
              className={`border bg-background/60 p-4 backdrop-blur-sm ${editingIndex === index ? "border-primary" : "border-border"}`}
            >
              {editingIndex === index && editingEntry ? (
                <PromptAttachmentForm
                  isEditing={true}
                  entry={editingEntry}
                  onChange={(data) => {
                    setEditingEntry(data.entry);
                  }}
                  availableTargets={getAvailableTargets(editingEntry.type)}
                  onSave={() => handleSaveEdit(index, editingEntry)}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <div className="flex flex-col items-stretch justify-center space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          entry.type === "embedding"
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {entry.type === "lora" ? "LoRA" : "Embedding"}
                      </span>
                      <span className="text-xs">{entry.target}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {entry.words.map((word, wordIndex) => (
                      <span
                        key={wordIndex}
                        className="bg-surface-hover rounded border border-border px-2 py-1 text-xs"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-end">
                    {entry.strength && entry.strength < 1 && (
                      <div className="grow">
                        <span className="items-center rounded bg-purple-500/20 px-2 py-1 text-xs">
                          strength:{entry.strength}
                        </span>
                      </div>
                    )}
                    <ButtonGroup>
                      <Button
                        onClick={() => handleEdit(index)}
                        variant="outline"
                        className="h-8 w-10"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        onClick={() => handleDelete(index)}
                        variant="destructive"
                        className="h-8 w-10"
                      >
                        <TrashIcon />
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}
      </>

      {promptAttachment?.length === 0 && !newEntry && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No attachment configured. Click "Add Entry" to create one.
        </div>
      )}
      <Modal isOpen={deleteConfirmIndex !== null} onClose={cancelDelete}>
        <Card className="mx-4 w-full max-w-sm border-border bg-background/90 shadow-2xl">
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delete Trigger Word?</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the trigger word for{" "}
                <span className="font-medium text-foreground">
                  {deleteConfirmIndex !== null &&
                    promptAttachment?.[deleteConfirmIndex]?.target}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={cancelDelete} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button onClick={confirmDelete} variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </Modal>
    </>
  );
}
