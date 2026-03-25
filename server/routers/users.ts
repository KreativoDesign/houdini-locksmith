import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createDepartment,
  getDepartmentById,
  getUserById,
  listDepartments,
  listUsers,
  seedDepartments,
  updateDepartment,
  updateUser,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";

// ─────────────────────────────────────────────
// DEPARTMENTS ROUTER
// ─────────────────────────────────────────────

export const departmentsRouter = router({
  /** Seed the 4 fixed departments if they don't exist yet */
  seed: adminProcedure.mutation(async () => {
    await seedDepartments();
    return { success: true };
  }),

  list: technicianProcedure.query(async () => {
    return listDepartments();
  }),

  get: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const dept = await getDepartmentById(input.id);
      if (!dept) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      return dept;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createDepartment({ name: input.name, description: input.description });
      return { id };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDepartment(id, data);
      return { success: true };
    }),
});

// ─────────────────────────────────────────────
// USERS ROUTER
// ─────────────────────────────────────────────

export const usersRouter = router({
  /** Current authenticated user's profile */
  me: technicianProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  list: managerProcedure
    .input(
      z.object({
        role: z.enum(["admin", "manager", "technician"]).optional(),
        departmentId: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return listUsers(input);
    }),

  get: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return user;
    }),

  /** Admin can update any user's role, department, or active status */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["admin", "manager", "technician"]).optional(),
        departmentId: z.number().int().positive().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateUser(id, data as Parameters<typeof updateUser>[1]);
      return { success: true };
    }),

  /** Assign a technician to a department */
  assignDepartment: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        departmentId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const dept = await getDepartmentById(input.departmentId);
      if (!dept) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });
      await updateUser(input.userId, { departmentId: input.departmentId });
      return { success: true };
    }),

  /** List all technicians (for job assignment dropdowns) */
  technicians: technicianProcedure
    .input(z.object({ departmentId: z.number().int().positive().optional() }).optional())
    .query(async ({ input }) => {
      return listUsers({ role: "technician", departmentId: input?.departmentId, isActive: true });
    }),
});
