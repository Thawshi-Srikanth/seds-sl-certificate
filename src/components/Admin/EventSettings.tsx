import React, { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Event } from '../../types';
import { updateEventSettings, createEvent } from '../../lib/supabase';
import { sha256Hex } from '../../lib/crypto';

interface EventSettingsProps {
  event: Event | null;
  onEventUpdated: () => void;
}

export const EventSettings: React.FC<EventSettingsProps> = ({ event, onEventUpdated }) => {
  const [name, setName] = useState(event?.name || '');
  const [slug, setSlug] = useState(event?.slug || '');
  const [description, setDescription] = useState(event?.description || '');
  const [newCode, setNewCode] = useState('');
  const [codeHashPreview, setCodeHashPreview] = useState('');
  const [enabled, setEnabled] = useState(event?.certificate_enabled ?? true);
  const [expiresAt, setExpiresAt] = useState(
    event?.code_expires_at ? new Date(event.code_expires_at).toISOString().slice(0, 16) : ''
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New Event Modal State
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvName, setNewEvName] = useState('');
  const [newEvSlug, setNewEvSlug] = useState('');
  const [newEvDesc, setNewEvDesc] = useState('');
  const [newEvCode, setNewEvCode] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setSlug(event.slug);
      setDescription(event.description || '');
      setEnabled(event.certificate_enabled);
      setExpiresAt(
        event.code_expires_at ? new Date(event.code_expires_at).toISOString().slice(0, 16) : ''
      );
    }
  }, [event]);

  useEffect(() => {
    async function computeHash() {
      if (!newCode.trim()) {
        setCodeHashPreview('');
        return;
      }
      const hash = await sha256Hex(newCode.trim());
      setCodeHashPreview(hash);
    }
    computeHash();
  }, [newCode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const success = await updateEventSettings(event.id, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        certificate_enabled: enabled,
        code_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        certificate_code: newCode.trim() || undefined,
      });

      if (success) {
        setSaveSuccess(true);
        setNewCode('');
        toast.success('Event configuration updated successfully');
        onEventUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const msg = 'Failed to update event settings.';
        setSaveError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      const msg = 'An error occurred while saving.';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvName || !newEvSlug || !newEvCode) {
      toast.warning('Please fill in event name, slug, and certificate code.');
      return;
    }

    setCreatingEvent(true);
    try {
      const res = await createEvent({
        name: newEvName.trim(),
        slug: newEvSlug.trim(),
        description: newEvDesc.trim(),
        certificate_code: newEvCode.trim(),
        certificate_enabled: true,
      });

      if (res.success) {
        toast.success(`Event "${newEvName}" created successfully!`);
        setShowNewEventModal(false);
        setNewEvName('');
        setNewEvSlug('');
        setNewEvDesc('');
        setNewEvCode('');
        onEventUpdated();
      } else {
        toast.error(res.message || 'Failed to create event.');
      }
    } catch (err) {
      console.error('Create event error:', err);
      toast.error('An unexpected error occurred while creating event.');
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <div className="apple-card space-y-6 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Event Configuration</h2>
          <p className="text-xs text-zinc-400">
            Configure parameters and livestream code for this event
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewEventModal(true)}
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
        >
          + Create New Event
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Event settings saved.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">Event Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="apple-input w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Event Slug (URL path e.g. /imot)
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="apple-input w-full rounded-xl px-3.5 py-2.5 font-mono text-sm text-zinc-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-300">
            Short Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Official certificate distribution for attendees."
            className="apple-input w-full rounded-xl px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* Certificate Code */}
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <h3 className="text-sm font-medium text-white">Certificate Verification Code</h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              The code participants enter. Only the SHA-256 hash is stored in the database.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                New Code (Leave blank to retain current)
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. IOTM26-X7K9Q"
                className="apple-input w-full rounded-xl px-3 py-2 font-mono text-sm uppercase"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">SHA-256 Hash Preview</label>
              <div className="apple-input w-full truncate rounded-xl bg-zinc-950/60 px-3 py-2 font-mono text-xs text-zinc-500">
                {codeHashPreview ||
                  (event?.certificate_code_hash
                    ? `${event.certificate_code_hash.slice(0, 24)}...`
                    : 'N/A')}
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div>
              <div className="text-xs font-medium text-white">Enable Certificate Claiming</div>
              <div className="text-[11px] text-zinc-400">
                Allow participants to verify & download
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Code Expiration Date & Time
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="apple-input w-full rounded-xl px-3 py-1.5 text-xs text-zinc-200"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="apple-card w-full max-w-md space-y-4 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-white">Create New Event</h3>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs text-zinc-300">Event Name</label>
                <input
                  type="text"
                  required
                  value={newEvName}
                  onChange={(e) => setNewEvName(e.target.value)}
                  placeholder="e.g. NASA Space Apps 2026"
                  className="apple-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-300">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newEvSlug}
                  onChange={(e) => setNewEvSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="space-apps"
                  className="apple-input w-full rounded-xl px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-300">Certificate Code</label>
                <input
                  type="text"
                  required
                  value={newEvCode}
                  onChange={(e) => setNewEvCode(e.target.value.toUpperCase())}
                  placeholder="e.g. APPS26-X8K"
                  className="apple-input w-full rounded-xl px-3 py-2 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-300">Description (Optional)</label>
                <input
                  type="text"
                  value={newEvDesc}
                  onChange={(e) => setNewEvDesc(e.target.value)}
                  placeholder="Participation verification portal"
                  className="apple-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
