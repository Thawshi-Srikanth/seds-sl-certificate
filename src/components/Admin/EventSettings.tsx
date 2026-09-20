import React, { useState, useEffect } from 'react';
import {
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Clock,
  Plus,
  X,
  Hourglass,
  Calendar,
} from 'lucide-react';
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

  // Generate random code helper
  const handleGenerateRandomCode = () => {
    const prefix = (slug || 'SEDS').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'SEDS';
    const year = '26';
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `${prefix}${year}-${randomSuffix}`;
    setNewCode(code);
    toast.success(`Generated new code: ${code}`);
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!newCode) return;
    navigator.clipboard.writeText(newCode);
    toast.success('Certificate code copied to clipboard!');
  };

  // Expiration presets
  const handleSetPresetExpiration = (minutesToAdd: number | null) => {
    if (minutesToAdd === null) {
      setExpiresAt('');
      toast.info('Expiration removed: Certificate code will never expire.');
      return;
    }

    const futureDate = new Date(Date.now() + minutesToAdd * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm in local time
    const tzOffset = futureDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(futureDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setExpiresAt(localISOTime);

    let label = `${minutesToAdd} minutes`;
    if (minutesToAdd >= 1440) {
      label = `${Math.round(minutesToAdd / 1440)} day(s)`;
    } else if (minutesToAdd >= 60) {
      label = `${Math.round(minutesToAdd / 60)} hour(s)`;
    }
    toast.success(`Expiration set to ${label} from now.`);
  };

  // Add 10 mins grace extension
  const handleExtendGracePeriod = () => {
    const baseTime = expiresAt ? new Date(expiresAt).getTime() : Date.now();
    const extended = new Date(Math.max(Date.now(), baseTime) + 10 * 60 * 1000);
    const tzOffset = extended.getTimezoneOffset() * 60000;
    const localISOTime = new Date(extended.getTime() - tzOffset).toISOString().slice(0, 16);
    setExpiresAt(localISOTime);
    toast.success('Extended expiration by +10 minutes!');
  };

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

  // Compute readable expiration status
  const getExpirationStatusText = () => {
    if (!expiresAt) return 'No expiration set (Never expires)';
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();

    if (diffMs <= 0) return 'Code Expired';

    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `Expires in ${diffMins} min${diffMins === 1 ? '' : 's'}`;
    const diffHours = Math.floor(diffMins / 60);
    const remainMins = diffMins % 60;
    if (diffHours < 24) return `Expires in ${diffHours}h ${remainMins}m`;
    const diffDays = Math.round(diffMins / 1440);
    return `Expires in ~${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };

  return (
    <div className="apple-card space-y-6 rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Event Configuration</h2>
          <p className="text-xs text-zinc-400">
            Configure parameters, automated livestream codes, and validity windows
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewEventModal(true)}
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Event</span>
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Name & Slug */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Event Name
            </label>
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
              URL Slug (e.g. /imot)
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
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Official certificate distribution for attendees."
            className="apple-input w-full rounded-xl px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* Certificate Code Section with 1-Click Auto-Generator */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-white">Livestream Certificate Code</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                The secret code participants must enter. Stored as a one-way SHA-256 hash.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateRandomCode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
              <span>Auto-Generate Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                New Certificate Code (Leave blank to keep existing)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IOTM26-X7K9Q"
                  className="apple-input w-full rounded-xl px-3.5 py-2.5 pr-10 font-mono text-sm uppercase tracking-wider"
                />
                {newCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copy code"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                SHA-256 Database Storage Hash
              </label>
              <div className="apple-input w-full truncate rounded-xl bg-zinc-950/60 px-3.5 py-2.5 font-mono text-xs text-zinc-500">
                {codeHashPreview ||
                  (event?.certificate_code_hash
                    ? `${event.certificate_code_hash.slice(0, 24)}...`
                    : 'N/A')}
              </div>
            </div>
          </div>
        </div>

        {/* Expiration Controller with Quick Preset Buttons */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-white">Code Validity & Expiration</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded-lg border border-zinc-800">
              <Hourglass className="h-3 w-3 text-zinc-400" />
              <span>{getExpirationStatusText()}</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="mb-2 block text-xs text-zinc-400 font-medium">
              Quick Expiration Presets (1-Click Set)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(5)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +5 Min
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(15)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +15 Min
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(30)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +30 Min
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(60)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(1440)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +1 Day
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(10080)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                +7 Days
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetExpiration(null)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                Never (No Limit)
              </button>
              <button
                type="button"
                onClick={handleExtendGracePeriod}
                className="ml-auto rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                +10 Min Grace
              </button>
            </div>
          </div>

          {/* Custom Date-Time Picker */}
          <div className="pt-1 border-t border-zinc-800/80">
            <label className="mb-1.5 block text-xs text-zinc-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              <span>Custom Expiration Date & Time</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="apple-input w-full rounded-xl px-3.5 py-2 text-xs text-zinc-200"
            />
          </div>
        </div>

        {/* Claiming Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div>
            <div className="text-xs font-medium text-white">Enable Certificate Claiming</div>
            <div className="text-[11px] text-zinc-400">
              When disabled, participants cannot claim certificates even with valid codes.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              enabled ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                enabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                <span>Saving Changes...</span>
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
          <div className="apple-card max-w-md w-full space-y-4 rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-white">Create New Event</h3>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
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
                  onChange={(e) =>
                    setNewEvSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                  }
                  placeholder="space-apps"
                  className="apple-input w-full rounded-xl px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-zinc-300">Certificate Code</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = (newEvSlug || 'EVENT').toUpperCase().slice(0, 4);
                      const rnd = Math.random().toString(36).substring(2, 7).toUpperCase();
                      setNewEvCode(`${prefix}26-${rnd}`);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-white underline"
                  >
                    Auto-Generate
                  </button>
                </div>
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
