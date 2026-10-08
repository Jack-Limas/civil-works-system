import { supplierRepository } from "../repositories/supplier.repository";
import { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput } from "../schemas/supplier.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";

export const supplierService = {
  async list(query: ListSuppliersQuery) {
    const skip = (query.page - 1) * query.limit;
    const [suppliers, total] = await supplierRepository.findMany({ search: query.search, skip, take: query.limit });
    return {
      data: suppliers,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  /**
   * Residents create suppliers inline from the expense form, so they may only
   * set name and NIT; the rest of the record is maintained by an admin.
   */
  async create(data: CreateSupplierInput, requester: RequestUser) {
    const input: CreateSupplierInput =
      requester.role === "ADMIN" ? data : { name: data.name, nit: data.nit, phone: undefined, notes: undefined };

    if (input.nit && (await supplierRepository.findByNit(input.nit))) {
      throw new AppError(409, "A supplier with this NIT already exists");
    }
    return supplierRepository.create(input);
  },

  async update(id: string, data: UpdateSupplierInput) {
    const existing = await supplierRepository.findById(id);
    if (!existing) throw new AppError(404, "Supplier not found");

    if (data.nit && data.nit !== existing.nit && (await supplierRepository.findByNit(data.nit))) {
      throw new AppError(409, "A supplier with this NIT already exists");
    }
    return supplierRepository.update(id, data);
  },

  /** Suppliers with purchase history are kept so past expenses stay traceable. */
  async remove(id: string) {
    const existing = await supplierRepository.findById(id);
    if (!existing) throw new AppError(404, "Supplier not found");
    if ((await supplierRepository.countExpenses(id)) > 0) {
      throw new AppError(409, "Supplier has registered expenses and cannot be deleted");
    }
    await supplierRepository.delete(id);
  },

  /**
   * Total purchased, transaction count and last purchase per supplier, plus the
   * top 3 by volume. Aggregation happens in one groupBy; supplier names come
   * from a single IN query joined in memory through a Map (no N+1).
   */
  async stats() {
    const totals = await supplierRepository.approvedTotalsBySupplier();
    const ids = totals.map((t) => t.supplierId).filter((id): id is string => id !== null);
    const suppliers = await supplierRepository.findManyByIds(ids);
    const byId = new Map(suppliers.map((s) => [s.id, s]));

    const rows = totals.flatMap((t) => {
      const supplier = t.supplierId ? byId.get(t.supplierId) : undefined;
      if (!supplier) return [];
      return [
        {
          supplierId: supplier.id,
          name: supplier.name,
          nit: supplier.nit,
          category: supplier.category,
          totalPurchased: Number(t._sum.amount ?? 0),
          transactions: t._count._all,
          lastPurchase: t._max.date,
        },
      ];
    });
    rows.sort((a, b) => b.totalPurchased - a.totalPurchased);

    return { suppliers: rows, top: rows.slice(0, 3) };
  },
};
