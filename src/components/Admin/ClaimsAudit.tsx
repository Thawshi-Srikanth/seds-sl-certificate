import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { CertificateClaim } from '../../types';
import { getClaimsAudit } from '../../lib/supabase';
import { maskEmail, formatDateTime } from '../../lib/crypto';

interface ClaimsAuditProps {
  eventId: string;
}

export const ClaimsAudit: React.FC<ClaimsAuditProps> = ({ eventId }) => {
  const [claims, setClaims] = useState<CertificateClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClaims = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClaimsAudit(eventId);
      setClaims(data);
    } catch (err) {
      console.error('Error loading claims audit:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  return (
    <div className="apple-card space-y-4 rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Certificate Claim Audit Trail</h2>
          <p className="text-xs text-zinc-400">
            Real-time audit log of verified certificate downloads
          </p>
        </div>

        <button
          type="button"
          onClick={loadClaims}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:text-white"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-zinc-300' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Timestamp</th>
              <th className="px-3 py-2.5">Participant</th>
              <th className="px-3 py-2.5">Masked Email</th>
              <th className="px-3 py-2.5 font-mono">IP Hash</th>
              <th className="px-3 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  <Loader2 className="mx-auto mb-1 h-4 w-4 animate-spin text-zinc-400" />
                  <span>Loading audit log...</span>
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-zinc-500">
                  No claims recorded yet for this event.
                </td>
              </tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-zinc-900/30">
                  <td className="px-3 py-2.5 font-mono text-zinc-400">
                    {formatDateTime(claim.claimed_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-white">
                      {claim.participant?.name || 'Verified Participant'}
                    </div>
                    {claim.participant?.registration_id && (
                      <div className="font-mono text-[10px] text-zinc-500">
                        {claim.participant.registration_id}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-zinc-400">{maskEmail(claim.email)}</td>
                  <td className="max-w-[120px] truncate px-3 py-2.5 font-mono text-[11px] text-zinc-500">
                    {claim.ip_hash ? `${claim.ip_hash.slice(0, 12)}...` : 'anonymized'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-xs font-medium text-emerald-400">Verified</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
