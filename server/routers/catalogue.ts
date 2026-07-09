import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCatalogueItem,
  deleteCatalogueItem,
  getCatalogueItemById,
  listCatalogueItems,
  seedDefaultCatalogueItems,
  updateCatalogueItem,
} from "../db";
import { router } from "../_core/trpc";
import { adminProcedure, technicianProcedure } from "./middleware";

export const catalogueRouter = router({
  /**
   * List all catalogue items.
   * Technicians+ see only active items; admins see everything.
   * Seeds default items on first call if the table is empty.
   */
  list: technicianProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      // Seed defaults for admins on first call
      if (isAdmin) {
        await seedDefaultCatalogueItems();
      }
      const activeOnly = isAdmin ? (input?.activeOnly ?? false) : true;
      return listCatalogueItems(activeOnly ? "part" : undefined);
    }),

  /** Create a new catalogue item (admin only) */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["part", "service", "labour", "other"]).default("service"),
        defaultPrice: z.number().nonnegative(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await createCatalogueItem({
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        defaultPrice: input.defaultPrice.toFixed(2),
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        createdById: ctx.user.id,
      });
      return { id };
    }),

  /** Update an existing catalogue item (admin only) */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: z.enum(["part", "service", "labour", "other"]).optional(),
        defaultPrice: z.number().nonnegative().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const item = await getCatalogueItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Catalogue item not found" });
      const { id, defaultPrice, ...rest } = input;
      await updateCatalogueItem(id, {
        ...rest,
        ...(defaultPrice !== undefined ? { defaultPrice: defaultPrice.toFixed(2) } : {}),
      });
      return { success: true };
    }),

  /** Delete a catalogue item (admin only) */
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const item = await getCatalogueItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Catalogue item not found" });
      await deleteCatalogueItem(input.id);
      return { success: true };
    }),

  /** Toggle active status (admin only) */
  toggleActive: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const item = await getCatalogueItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Catalogue item not found" });
      await updateCatalogueItem(input.id, { isActive: !item.isActive });
      return { isActive: !item.isActive };
    }),

  /** Reorder items by providing an ordered array of IDs (admin only) */
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int().positive()) }))
    .mutation(async ({ input }) => {
      await Promise.all(
        input.orderedIds.map((id, index) => updateCatalogueItem(id, { sortOrder: index + 1 }))
      );
      return { success: true };
    }),
});
