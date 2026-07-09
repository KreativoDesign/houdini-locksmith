import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { countClients, createClient, getClientById, getClientWithEnquiries, listClients, updateClient } from "../db";
import { managerProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";

export const clientsRouter = router({
  list: technicianProcedure
    .input(
      z.object({
        search: z.string().optional(),
        includeInactive: z.boolean().optional(),
        limit: z.number().int().positive().max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const [rows, total] = await Promise.all([
        listClients(input),
        countClients(),
      ]);
      return { rows, total };
    }),

  get: technicianProcedure
    .input(z.object({ id: z.number().int().positive(), withEnquiries: z.boolean().optional() }))
    .query(async ({ input }) => {
      if (input.withEnquiries) {
        const client = await getClientWithEnquiries(input.id);
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        return client;
      }
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      return client;
    }),

  create: technicianProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email().optional(),
        phone: z.string().min(1).max(30),
        alternatePhone: z.string().max(30).optional(),
        address: z.string().optional(),
        city: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createClient(input);
      return { id };
    }),

  update: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional(),
        alternatePhone: z.string().max(30).nullable().optional(),
        address: z.string().optional(),
        city: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const existing = await getClientById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      await updateClient(id, data);
      return { success: true };
    }),

  /** Soft-delete: mark as inactive */
  deactivate: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const existing = await getClientById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      await updateClient(input.id, { isActive: false });
      return { success: true };
    }),
});
