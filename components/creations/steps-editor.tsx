"use client";

import React, { useState, useId } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "@/components/ui/markdown-view";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  ViewIcon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface StepItem {
  id: string;
  position: number;
  title: string;
  body: string | null;
}

interface StepsEditorProps {
  steps: StepItem[];
  onChange: (steps: StepItem[]) => void;
  maxSteps?: number;
}

export function StepsEditor({
  steps,
  onChange,
  maxSteps = 20,
}: StepsEditorProps) {
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddStep = () => {
    if (steps.length >= maxSteps) {
      toast.error(`You can add up to ${maxSteps} steps`);
      return;
    }

    const newStep: StepItem = {
      id: crypto.randomUUID(),
      position: steps.length,
      title: `Step ${steps.length + 1}`,
      body: "",
    };

    onChange([...steps, newStep]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(steps, oldIndex, newIndex).map(
        (step, idx) => ({
          ...step,
          position: idx,
        })
      );
      onChange(reordered);
    }
  };

  const handleUpdateStep = (
    id: string,
    field: "title" | "body",
    value: string
  ) => {
    const updated = steps.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    onChange(updated);
  };

  const handleDeleteStep = (id: string) => {
    const remaining = steps
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, position: idx }));
    onChange(remaining);
  };

  return (
    <div className="space-y-4">
      {steps.length > 0 ? (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {steps.map((step, index) => (
                <SortableStepCard
                  key={step.id}
                  step={step}
                  index={index}
                  onUpdate={(field, val) =>
                    handleUpdateStep(step.id, field, val)
                  }
                  onDelete={() => handleDeleteStep(step.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            No process steps added yet
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Documenting how you built this (prompts, architecture, workflow) helps other creators learn.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddStep}
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            Add first step
          </Button>
        </div>
      )}

      {steps.length > 0 && steps.length < maxSteps && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          className="w-full"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          Add another step ({steps.length}/{maxSteps})
        </Button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sortable Step Card
// -----------------------------------------------------------------------------

interface SortableStepCardProps {
  step: StepItem;
  index: number;
  onUpdate: (field: "title" | "body", value: string) => void;
  onDelete: () => void;
}

function SortableStepCard({
  step,
  index,
  onUpdate,
  onDelete,
}: SortableStepCardProps) {
  const [isPreview, setIsPreview] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-all space-y-3",
        isDragging && "opacity-50 ring-2 ring-brand shadow-lg z-20"
      )}
    >
      {/* Header: drag handle, title input, preview toggle, delete button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder step"
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
        </button>

        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
          {index + 1}
        </span>

        <Input
          type="text"
          placeholder="Step title (e.g. System Prompt Design)..."
          value={step.title}
          onChange={(e) => onUpdate("title", e.target.value)}
          className="h-9 font-semibold text-sm flex-1"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsPreview(!isPreview)}
          title={isPreview ? "Edit markdown" : "Preview markdown"}
        >
          {isPreview ? (
            <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
          ) : (
            <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
          title="Delete step"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
        </Button>
      </div>

      {/* Body: Markdown edit or preview */}
      <div>
        {isPreview ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 min-h-24">
            {step.body?.trim() ? (
              <MarkdownView content={step.body} />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No step details written yet.
              </p>
            )}
          </div>
        ) : (
          <Textarea
            placeholder="Describe what you did in this step, decisions made, or code snippets (markdown supported)..."
            value={step.body || ""}
            onChange={(e) => onUpdate("body", e.target.value)}
            rows={4}
            className="text-sm font-sans resize-y"
          />
        )}
      </div>
    </div>
  );
}
