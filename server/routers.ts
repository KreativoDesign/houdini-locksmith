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
import { catalogueRouter } from "./routers/catalogue";
import { localAuthRouter } from "./routers/auth";
import { clientPortalRouter } from "./routers/clientPortal";
import { pushRouter } from "./routers/push";
import { quotesRouter } from "./routers/quotes";

export const appRouter = router({
  system: systemRouter,

  /**
   * auth — Authentication and session management.
   *
   * Public:  login, register, validateInvite, me
   * Protected: logout, changePassword, mustChangePassword, hasLocalCredential
   * Admin:   createInvite, listInvites, resetPassword, unlockAccount,
   *          updateUserRole, listUsersWithCredentials
   * Manager: auditLog (own entries only)
   */
  auth: localAuthRouter,

  /** Web Push notifications for PWA */
  push: pushRouter,

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

  /** Admin-configurable pricing catalogue for quick-add job items */
  catalogue: catalogueRouter,

  /** Public read-only client portal (token-based, no auth required) */
  clientPortal: clientPortalRouter,

  /** Standalone quote system for admin/manager creation and client acceptance */
  quotes: quotesRouter,
});

export type AppRouter = typeof appRouter;
