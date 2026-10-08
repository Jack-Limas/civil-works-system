import { fundTransferRepository } from "../repositories/fund-transfer.repository";
import { userRepository } from "../repositories/user.repository";
import { RequestUser } from "../types/auth";

export interface ResidentBalance {
  residentId: string;
  name: string;
  email: string;
  transfersReceived: number;
  transfersCount: number;
  lastTransferAt: Date | null;
  approvedExpenses: number;
  pendingExpenses: number;
  /** transfers - (PENDING + APPROVED expenses registered by the resident). Negative = to reimburse. */
  balance: number;
  /** Share of the received funds already spent (0-100+, null when nothing was received). */
  usedPercentage: number | null;
}

export const cashService = {
  /**
   * Petty-cash balances. Admin: every resident. Resident: only their own.
   * Two groupBy queries regardless of the number of residents; results are
   * joined through Maps keyed by resident id.
   */
  async balances(requester: RequestUser) {
    const residents =
      requester.role === "ADMIN"
        ? await userRepository.findAllPublic("RESIDENT_ENGINEER")
        : await userRepository.findPublicByIds([requester.sub]);
    const ids = residents.map((r) => r.id);

    const [transfers, expenses] = await Promise.all([
      fundTransferRepository.sumByResident(ids),
      fundTransferRepository.sumResidentExpenses(ids),
    ]);

    const transfersById = new Map(transfers.map((t) => [t.residentId, t]));
    const spentById = new Map<string, { approved: number; pending: number }>();
    for (const row of expenses) {
      if (!row.registeredById) continue;
      const current = spentById.get(row.registeredById) ?? { approved: 0, pending: 0 };
      const amount = Number(row._sum.amount ?? 0);
      if (row.status === "APPROVED") current.approved += amount;
      else current.pending += amount;
      spentById.set(row.registeredById, current);
    }

    const balances: ResidentBalance[] = residents.map((r) => {
      const t = transfersById.get(r.id);
      const spent = spentById.get(r.id) ?? { approved: 0, pending: 0 };
      const received = Number(t?._sum.amount ?? 0);
      const used = spent.approved + spent.pending;
      return {
        residentId: r.id,
        name: r.name,
        email: r.email,
        transfersReceived: received,
        transfersCount: t?._count._all ?? 0,
        lastTransferAt: t?._max.date ?? null,
        approvedExpenses: spent.approved,
        pendingExpenses: spent.pending,
        balance: received - used,
        usedPercentage: received > 0 ? Math.round((used / received) * 1000) / 10 : null,
      };
    });
    balances.sort((a, b) => b.transfersReceived - a.transfersReceived);

    return {
      residents: balances,
      totals: {
        transfersReceived: balances.reduce((s, b) => s + b.transfersReceived, 0),
        spent: balances.reduce((s, b) => s + b.approvedExpenses + b.pendingExpenses, 0),
        // Cash still in residents' hands (sum of balances; negatives are amounts to reimburse)
        cashBalance: balances.reduce((s, b) => s + b.balance, 0),
        toReimburse: balances.reduce((s, b) => s + Math.max(0, -b.balance), 0),
      },
    };
  },
};
