"use client";

import { useCallback, useEffect, useState } from "react";
import { SortableCircleList } from "@/components/SortableCircleList";
import type { CircleMember, CircleMemberInput } from "@/lib/types";

const EMPTY_FORM: CircleMemberInput = {
  name: "",
  relationship: "",
  phone: "",
};

interface MyCircleModalProps {
  open: boolean;
  onClose: () => void;
}

export function MyCircleModal({ open, onClose }: MyCircleModalProps) {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CircleMemberInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/circle");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      setError("Could not load My Circle");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMembers();
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [open, loadMembers]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.relationship.trim()) {
      setError("Name and relationship are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/circle/${editingId}` : "/api/circle";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      await loadMembers();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member: CircleMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      relationship: member.relationship,
      phone: member.phone,
    });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this person from My Circle?")) return;

    try {
      const res = await fetch(`/api/circle/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (editingId === id) resetForm();
      await loadMembers();
    } catch {
      setError("Could not remove member");
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    const previousMembers = members;
    const reorderedMembers = orderedIds
      .map((id) => members.find((member) => member.id === id))
      .filter((member): member is CircleMember => Boolean(member));

    setMembers(reorderedMembers);
    setReordering(true);
    setError(null);

    try {
      const res = await fetch("/api/circle/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Reorder failed");
      }

      const data = await res.json();
      setMembers(data.members ?? reorderedMembers);
    } catch (err) {
      setMembers(previousMembers);
      setError(err instanceof Error ? err.message : "Could not reorder Circle");
    } finally {
      setReordering(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close My Circle"
      />

      <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                My Circle
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                The people you trust.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : members.length === 0 ? (
            <div className="rounded-2xl bg-teal-50 px-4 py-8 text-center">
              <p className="text-sm text-teal-800">
                Add someone you trust — a sponsor, friend, or family member.
              </p>
            </div>
          ) : (
            <>
              <SortableCircleList
                members={members}
                reordering={reordering}
                onReorder={handleReorder}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            {editingId ? "Edit person" : "Add to My Circle"}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <input
              type="text"
              placeholder="Relationship (e.g. Sponsor, Partner, Friend)"
              value={form.relationship}
              onChange={(e) =>
                setForm((f) => ({ ...f, relationship: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <input
              type="tel"
              placeholder="Phone (+1...)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-amber-700">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add person"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
