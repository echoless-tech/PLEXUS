import { useEffect, useMemo, useState } from 'react';
import { fetchMilestones } from '../services/contracts';
import type { Contract, Milestone } from '../types';

/**
 * Loads the milestones for a set of contracts and keeps them keyed by
 * contract id. Re-fetches only when the set (or an updatedAt) changes.
 * Reads that the rules deny (e.g. a funder on an unlisted contract)
 * resolve to an empty list rather than failing the whole page.
 */
export function useMilestonesFor(contracts: Contract[]): { byContract: Record<string, Milestone[]>; all: Milestone[]; loading: boolean } {
  const key = contracts.map((c) => c.id + ':' + c.updatedAt.getTime()).join('|');
  const [byContract, setByContract] = useState<Record<string, Milestone[]>>({});
  const [loading, setLoading] = useState(contracts.length > 0);

  useEffect(() => {
    let cancelled = false;
    if (contracts.length === 0) {
      setByContract({});
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const entries = await Promise.all(
        contracts.map(async (c) => [c.id, await fetchMilestones(c.id).catch(() => [] as Milestone[])] as const),
      );
      if (!cancelled) {
        setByContract(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => Object.values(byContract).flat(), [byContract]);
  return { byContract, all, loading };
}
