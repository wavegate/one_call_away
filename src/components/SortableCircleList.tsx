"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CircleMember } from "@/lib/types";

interface SortableCircleMemberProps {
  member: CircleMember;
  reordering: boolean;
  onEdit: (member: CircleMember) => void;
  onDelete: (id: string) => void;
}

function SortableCircleMember({
  member,
  reordering,
  onEdit,
  onDelete,
}: SortableCircleMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id, disabled: reordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-slate-50/80 px-4 py-3 ${
        isDragging
          ? "z-10 border-teal-300 bg-white shadow-lg"
          : "border-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="mt-0.5 flex shrink-0 touch-none flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-40"
            aria-label={`Drag to reorder ${member.name}`}
            disabled={reordering}
            {...attributes}
            {...listeners}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="4" r="1.25" />
              <circle cx="11" cy="4" r="1.25" />
              <circle cx="5" cy="8" r="1.25" />
              <circle cx="11" cy="8" r="1.25" />
              <circle cx="5" cy="12" r="1.25" />
              <circle cx="11" cy="12" r="1.25" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{member.name}</p>
            <p className="text-sm text-teal-700">{member.relationship}</p>
            <p className="mt-1 text-sm text-slate-500">
              {member.phone || "No phone added"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(member)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(member.id)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

interface SortableCircleListProps {
  members: CircleMember[];
  reordering: boolean;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onEdit: (member: CircleMember) => void;
  onDelete: (id: string) => void;
}

export function SortableCircleList({
  members,
  reordering,
  onReorder,
  onEdit,
  onDelete,
}: SortableCircleListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = members.findIndex((member) => member.id === active.id);
    const newIndex = members.findIndex((member) => member.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(members, oldIndex, newIndex);
    await onReorder(reordered.map((member) => member.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={members.map((member) => member.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-3">
          {members.map((member) => (
            <SortableCircleMember
              key={member.id}
              member={member}
              reordering={reordering}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
