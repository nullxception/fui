import { useQuery } from "@tanstack/react-query";
import Modal from "client/components/Modal";
import { Button } from "client/components/ui/button";
import { ButtonGroup } from "client/components/ui/button-group";
import { Card } from "client/components/ui/card";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "client/components/ui/input-group";
import { Label } from "client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "client/components/ui/select";
import { useTRPC } from "client/query";
import {
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import React, { useState } from "react";
import { splitSmart } from "server/lib/metadataParser";
import type { ExtraDataType, TriggerWord } from "server/types";
import { useTriggerWords } from "./useTriggerWords";

interface TriggerWordFormProps {
  isEditing?: boolean;
  entry: TriggerWord;
  onChange: (entry: TriggerWord) => void;
  availableTargets: string[];
  onSave: () => void;
  onCancel: () => void;
}

function TriggerWordForm({
  isEditing = false,
  entry,
  onChange,
  availableTargets,
  onSave,
  onCancel,
}: TriggerWordFormProps) {
  const [wordInput, setWordInput] = useState("");

  const handleAddWord = () => {
    const newWords = splitSmart(wordInput);
    if (newWords.length > 0) {
      onChange({
        ...entry,
        words: [...entry.words, ...newWords],
      });
      setWordInput("");
    }
  };

  const handleRemoveWord = (index: number) => {
    onChange({
      ...entry,
      words: entry.words.filter((_, i) => i !== index),
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
    onChange({
      ...entry,
      loraStrength: value,
    });
  };

  const loraStrength = entry.loraStrength ?? 1;
  const typeLabel = entry.type === "lora" ? "LoRA" : "Embedding";

  const isSaveable = () => {
    if (!entry.target) return false;
    const hasWords = entry.words.length > 0;
    if (entry.type === "embedding" && !hasWords) return false;
    if (entry.type === "lora") {
      if (!hasWords && loraStrength >= 1) return false;
    }
    return true;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-row gap-3">
        <Select
          value={entry.type}
          disabled={isEditing}
          onValueChange={(e) =>
            onChange({
              ...entry,
              type: e as ExtraDataType,
              target: "", // Reset target when type changes
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
          disabled={isEditing}
          onValueChange={(e) =>
            onChange({
              ...entry,
              target: e,
            })
          }
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
          onClick={onSave}
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

function TriggerWordsEditor() {
  const { triggerWords, addTW, updateTW, deleteTW } = useTriggerWords();
  const rpc = useTRPC();
  const { data } = useQuery(rpc.listModels.queryOptions());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState<TriggerWord | null>(null);
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

  const handleSaveNew = () => {
    if (!newEntry) return;
    const loraStrength = newEntry.loraStrength ?? 1;
    const isSaveable = newEntry.words.length > 0 || loraStrength < 1;
    if (newEntry && newEntry.target && isSaveable) {
      let tw = newEntry;
      if (loraStrength < 1) {
        tw = {
          ...newEntry,
          loraStrength: normalizeFP(newEntry.loraStrength),
        };
      }
      addTW(tw);
      setNewEntry(null);
    }
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
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updated: TriggerWord) => {
    let tw = updated;
    const loraStrength = updated.loraStrength ?? 1;

    if (loraStrength < 1) {
      tw = {
        ...updated,
        loraStrength: normalizeFP(updated.loraStrength),
      };
    }
    updateTW(index, tw);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const getAvailableTargets = (type: ExtraDataType) => {
    if (!data) return [];

    return type === "embedding" ? data.embeddings : data.loras;
  };

  return (
    <>
      <Card className="col-span-1 row-span-1 flex flex-row items-center justify-between bg-background/60 p-4 backdrop-blur-sm md:col-span-2">
        <h2>Trigger Words</h2>
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
        <Card className="col-span-1 border-primary bg-background/60 p-4 backdrop-blur-sm md:col-span-2">
          <TriggerWordForm
            entry={newEntry}
            onChange={setNewEntry}
            availableTargets={getAvailableTargets(newEntry.type)}
            onSave={handleSaveNew}
            onCancel={handleCancelNew}
          />
        </Card>
      )}

      {/* Existing Entries */}
      <>
        {triggerWords.map((entry, index) => (
          <div key={index}>
            <Card
              className={`bg-background/60 p-4 backdrop-blur-sm ${editingIndex === index ? "border-primary" : "border-border"}`}
            >
              {editingIndex === index ? (
                <TriggerWordForm
                  isEditing={true}
                  entry={entry}
                  onChange={(updated) => {
                    // Update in place for editing
                    updateTW(index, updated);
                  }}
                  availableTargets={getAvailableTargets(entry.type)}
                  onSave={() => handleSaveEdit(index, entry)}
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
                    {entry.loraStrength && entry.loraStrength < 1 && (
                      <div className="grow">
                        <span className="items-center rounded bg-purple-500/20 px-2 py-1 text-xs">
                          strength:{entry.loraStrength}
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

      {triggerWords.length === 0 && !newEntry && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No trigger words configured. Click "Add Entry" to create one.
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
                  {deleteConfirmIndex &&
                    triggerWords[deleteConfirmIndex]?.target}
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

export default TriggerWordsEditor;
