import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { StatsOverview } from './StatsOverview';
import { ParticipantsManager } from './ParticipantsManager';
import { EventSettings } from './EventSettings';
import { ClaimsAudit } from './ClaimsAudit';
import { Event, DashboardStats } from '../../types';
import {
  getAdminEvents,
  getDashboardStats,
  resetMockData,
  isSupabaseConfigured,
  supabase,
} from '../../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'participants' | 'settings' | 'audit'>(
    'stats'
  );

  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    eligibleParticipants: 0,
    claimedCertificates: 0,
    unclaimedCertificates: 0,
    claimRate: 0,
  });

  const loadEventsAndStats = React.useCallback(async () => {
    try {
      const eventList = await getAdminEvents();
      setEvents(eventList);

      if (eventList.length > 0) {
        const active = eventList.find((e) => e.id === selectedEventId) || eventList[0];
        setSelectedEventId(active.id);
        setCurrentEvent(active);

        const calculatedStats = await getDashboardStats(active.id);
        setStats(calculatedStats);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEventsAndStats();
  }, [loadEventsAndStats]);

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setSelectedEventId(nextId);
    const target = events.find((ev) => ev.id === nextId) || null;
    setCurrentEvent(target);
    if (target) {
      toast.info(`Switched to ${target.name}`);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('seds_admin_demo_session');
    toast.success('Signed out successfully');
    onLogout();
    navigate('/');
  };

  const handleResetDemoData = () => {
    if (window.confirm && window.confirm('Reset all demo records to initial state?')) {
      resetMockData();
      loadEventsAndStats();
      toast.success('Demo data restored to initial state');
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            SEDS Sri Lanka Certificate Management Platform
          </p>
        </div>

        {/* Event Select & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={handleEventChange}
              className="apple-input rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} (/{ev.slug})
                </option>
              ))}
            </select>
          )}

          {!isSupabaseConfigured && (
            <button
              type="button"
              onClick={handleResetDemoData}
              title="Reset Demo Data"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-800 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`rounded-xl px-3.5 py-2 font-medium transition-colors ${
            activeTab === 'stats' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Overview & Stats
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-medium transition-colors ${
            activeTab === 'participants'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Participants</span>
          <span className="font-mono text-[10px] text-zinc-500">{stats.totalParticipants}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`rounded-xl px-3.5 py-2 font-medium transition-colors ${
            activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Event Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-medium transition-colors ${
            activeTab === 'audit' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span>Audit Log</span>
          <span className="font-mono text-[10px] text-zinc-500">{stats.claimedCertificates}</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentEvent && (
        <div className="pt-2">
          {activeTab === 'stats' && (
            <StatsOverview
              stats={stats}
              currentEvent={currentEvent}
              onRefresh={loadEventsAndStats}
            />
          )}

          {activeTab === 'participants' && (
            <ParticipantsManager eventId={currentEvent.id} onDataChanged={loadEventsAndStats} />
          )}

          {activeTab === 'settings' && (
            <EventSettings event={currentEvent} onEventUpdated={loadEventsAndStats} />
          )}

          {activeTab === 'audit' && <ClaimsAudit eventId={currentEvent.id} />}
        </div>
      )}
    </div>
  );
};
