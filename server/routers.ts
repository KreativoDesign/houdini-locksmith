import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Feature routers
import { departmentsRouter, usersRouter } from "./routers/users";
import { clientsRouter } from "./routers/clients";
import { enquiriesRouter } from "./routers/enquiries";
import { jobCardsRouter } from "./routers/jobCards";
import { schedulingRouter } from "./routers/scheduling";
import { jobItemsRouter } from "./routers/jobItems";
import { signaturesRouter } from "./routers/signatures";
import { pricingRouter } from "./routers/pricing";
import { documentsRouter } from "./routers/documents";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─────────────────────────────────────────────
  // CORE MODULES
  // ─────────────────────────────────────────────

  /** Department management (Locksmithing, Security, Diagnostics, Workshop) */
  departments: departmentsRouter,

  /** User management with role-based access */
  users: usersRouter,

  /** Client records */
  clients: clientsRouter,

  /** Enquiries and conversion to job cards */
  enquiries: enquiriesRouter,

  /** Job card lifecycle management */
  jobCards: jobCardsRouter,

  /** 45-minute time slot scheduling and employee availability */
  scheduling: schedulingRouter,

  /** Job items — parts, services, and labour */
  jobItems: jobItemsRouter,

  /** Digital signature capture and storage */
  signatures: signaturesRouter,

  /** Job pricing with approval workflow */
  pricing: pricingRouter,

  /** Job-related document and photo storage */
  documents: documentsRouter,

  /** In-app notifications */
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
