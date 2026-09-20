import React from 'react';
import { DashboardStats, Event } from '../../types';

interface StatsOverviewProps {
  stats: DashboardStats;
  currentEvent: Event | null;
  onRefresh: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, currentEvent }) => {
  const isEnabled = currentEvent?.certificate_enabled ?? false;
  const isExpired = currentEvent?.code_expires_at
    ? new Date() > new Date(currentEvent.code_expires_at)
    : false;

  return (
    <div className="space-y-6">
      {/* Event Header Card */}
      <div className="apple-card flex flex-col items-start justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
        <div>
          <div className="font-mono text-xs text-zinc-500">/{currentEvent?.slug}</div>
          <h2 className="mt-0.5 text-lg font-semibold text-white">{currentEvent?.name}</h2>
          {currentEvent?.description && (
            <p className="mt-1 text-xs text-zinc-400">{currentEvent.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEnabled && !isExpired ? (
            <span className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-1 text-xs font-medium text-emerald-300">
              Active
            </span>
          ) : isExpired ? (
            <span className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1 text-xs font-medium text-amber-300">
              Code Expired
            </span>
          ) : (
            <span className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400">
              Disabled
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Total Registered */}
        <div className="apple-card rounded-2xl p-5">
          <div className="text-xs text-zinc-400">Total Registered</div>
          <div className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
            {stats.totalParticipants}
          </div>
        </div>

        {/* Eligible */}
        <div className="apple-card rounded-2xl p-5">
          <div className="text-xs text-zinc-400">Eligible</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100 sm:text-3xl">
            {stats.eligibleParticipants}
          </div>
        </div>

        {/* Claimed */}
        <div className="apple-card rounded-2xl p-5">
          <div className="text-xs text-zinc-400">Claimed</div>
          <div className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
            {stats.claimedCertificates}
          </div>
        </div>

        {/* Pending */}
        <div className="apple-card rounded-2xl p-5">
          <div className="text-xs text-zinc-400">Pending Claim</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-400 sm:text-3xl">
            {stats.unclaimedCertificates}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="apple-card space-y-3 rounded-2xl p-6">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-300">Claim Completion Rate</span>
          <span className="font-mono font-semibold text-white">{stats.claimRate}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-white transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, stats.claimRate))}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-zinc-500">
          <span>{stats.claimedCertificates} verified</span>
          <span>{stats.eligibleParticipants} eligible</span>
        </div>
      </div>
    </div>
  );
};
