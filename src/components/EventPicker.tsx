import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { Event } from '../types';
import { getAllPublicEvents } from '../lib/supabase';

export const EventPicker: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const list = await getAllPublicEvents();
        setEvents(list);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Certificate Portal
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Select your event to verify and download your certificate of participation.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event name or code..."
          className="apple-input w-full rounded-xl py-3 pl-10 pr-4 text-sm placeholder-zinc-500"
        />
      </div>

      {/* Events List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-zinc-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-zinc-400" />
            <span className="text-xs">Loading events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="apple-card rounded-2xl p-8 text-center text-sm text-zinc-400">
            No events found matching &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <Link
              key={event.id}
              to={`/${event.slug}`}
              className="apple-card group flex items-center justify-between rounded-xl p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <div>
                <div className="text-sm font-medium text-white group-hover:text-zinc-100">
                  {event.name}
                </div>
                {event.description && (
                  <div className="mt-0.5 text-xs text-zinc-400">{event.description}</div>
                )}
                <div className="mt-1 font-mono text-[11px] text-zinc-500">/{event.slug}</div>
              </div>
              <ChevronRight className="ml-4 h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
