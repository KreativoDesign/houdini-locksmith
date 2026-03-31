import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

// ─────────────────────────────────────────────
// USERS  (extends the auth user with role + department)
// ─────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** System-level role: admin has full access, manager manages a department, technician executes jobs */
  role: mysqlEnum("role", ["admin", "manager", "technician"]).default("technician").notNull(),
  departmentId: int("departmentId").references(() => departments.id),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  alternatePhone: varchar("alternatePhone", { length: 30 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postalCode", { length: 20 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─────────────────────────────────────────────
// ENQUIRIES
// ─────────────────────────────────────────────
export const enquiryStatusEnum = mysqlEnum("enquiryStatus", [
  "new",
  "in_review",
  "converted",
  "closed",
]);

export const enquiries = mysqlTable("enquiries", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId")
    .notNull()
    .references(() => clients.id),
  departmentId: int("departmentId").references(() => departments.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["new", "in_review", "converted", "closed"])
    .default("new")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
    .default("normal")
    .notNull(),
  source: mysqlEnum("source", ["phone", "email", "walk_in", "online", "referral"])
    .default("phone")
    .notNull(),
  /** Service type maps to a department specialisation */
  serviceType: mysqlEnum("serviceType", ["locksmithing", "security", "diagnostics", "workshop", "other"]).default("other"),
  assignedToId: int("assignedToId").references(() => users.id),
  convertedToJobCardId: int("convertedToJobCardId"), // populated after conversion
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = typeof enquiries.$inferInsert;

// ─────────────────────────────────────────────
// JOB CARDS
// ─────────────────────────────────────────────
export const jobCards = mysqlTable("jobCards", {
  id: int("id").autoincrement().primaryKey(),
  jobNumber: varchar("jobNumber", { length: 30 }).notNull().unique(), // e.g. JC-2024-0001
  clientId: int("clientId")
    .notNull()
    .references(() => clients.id),
  enquiryId: int("enquiryId").references(() => enquiries.id), // null if created directly
  departmentId: int("departmentId")
    .notNull()
    .references(() => departments.id),
  assignedTechnicianId: int("assignedTechnicianId").references(() => users.id),
  assignedManagerId: int("assignedManagerId").references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "pending",
    "assigned",
    "in_progress",
    "on_hold",
    "completed",
    "awaiting_pricing",
    "priced",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
    .default("normal")
    .notNull(),
  scheduledDate: timestamp("scheduledDate"),
  scheduledTimeSlotId: int("scheduledTimeSlotId"), // FK set after time_slots table
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  technicianNotes: text("technicianNotes"),
  managerNotes: text("managerNotes"),
  requiresSignature: boolean("requiresSignature").default(true).notNull(),
  isSigned: boolean("isSigned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobCard = typeof jobCards.$inferSelect;
export type InsertJobCard = typeof jobCards.$inferInsert;

// ─────────────────────────────────────────────
// TIME SLOTS  (45-minute intervals, pre-generated per day)
// ─────────────────────────────────────────────
export const timeSlots = mysqlTable("timeSlots", {
  id: int("id").autoincrement().primaryKey(),
  /** ISO date string: YYYY-MM-DD */
  slotDate: varchar("slotDate", { length: 10 }).notNull(),
  /** HH:MM 24-hour start time, e.g. "08:00" */
  startTime: varchar("startTime", { length: 5 }).notNull(),
  /** HH:MM 24-hour end time, e.g. "08:45" */
  endTime: varchar("endTime", { length: 5 }).notNull(),
  /** Which technician this slot belongs to */
  technicianId: int("technicianId")
    .notNull()
    .references(() => users.id),
  isBooked: boolean("isBooked").default(false).notNull(),
  jobCardId: int("jobCardId").references(() => jobCards.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TimeSlot = typeof timeSlots.$inferSelect;
export type InsertTimeSlot = typeof timeSlots.$inferInsert;

// ─────────────────────────────────────────────
// EMPLOYEE AVAILABILITY
// ─────────────────────────────────────────────
export const employeeAvailability = mysqlTable("employeeAvailability", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  /** ISO date string: YYYY-MM-DD */
  availableDate: varchar("availableDate", { length: 10 }).notNull(),
  /** HH:MM */
  startTime: varchar("startTime", { length: 5 }).notNull(),
  /** HH:MM */
  endTime: varchar("endTime", { length: 5 }).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  reason: varchar("reason", { length: 255 }), // e.g. "leave", "training"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeAvailability = typeof employeeAvailability.$inferSelect;
export type InsertEmployeeAvailability = typeof employeeAvailability.$inferInsert;

// ─────────────────────────────────────────────
// JOB ITEMS  (parts / services added to a job card)
// ─────────────────────────────────────────────
export const jobItems = mysqlTable("jobItems", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId")
    .notNull()
    .references(() => jobCards.id),
  type: mysqlEnum("type", ["part", "service", "labour", "other"])
    .default("part")
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  /** Discount percentage 0–100 */
  discountPct: decimal("discountPct", { precision: 5, scale: 2 }).default("0"),
  /** Computed: quantity * unitPrice * (1 - discountPct/100) */
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  addedById: int("addedById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobItem = typeof jobItems.$inferSelect;
export type InsertJobItem = typeof jobItems.$inferInsert;

// ─────────────────────────────────────────────
// SIGNATURES
// ─────────────────────────────────────────────
export const signatures = mysqlTable("signatures", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId")
    .notNull()
    .unique()
    .references(() => jobCards.id),
  /** S3 URL of the stored signature image */
  signatureUrl: text("signatureUrl").notNull(),
  /** S3 key for deletion */
  signatureKey: varchar("signatureKey", { length: 512 }).notNull(),
  signerName: varchar("signerName", { length: 200 }).notNull(),
  signerRole: varchar("signerRole", { length: 100 }), // e.g. "Client", "Authorised Representative"
  ipAddress: varchar("ipAddress", { length: 45 }),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  capturedById: int("capturedById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Signature = typeof signatures.$inferSelect;
export type InsertSignature = typeof signatures.$inferInsert;

// ─────────────────────────────────────────────
// JOB PRICING
// ─────────────────────────────────────────────
export const jobPricing = mysqlTable("jobPricing", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId")
    .notNull()
    .unique()
    .references(() => jobCards.id),
  labourCost: decimal("labourCost", { precision: 10, scale: 2 }).default("0").notNull(),
  partsCost: decimal("partsCost", { precision: 10, scale: 2 }).default("0").notNull(),
  /** Additional fees (call-out, travel, etc.) */
  additionalFees: decimal("additionalFees", { precision: 10, scale: 2 }).default("0").notNull(),
  /** Discount amount in currency */
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  /** VAT percentage, e.g. 15.00 for 15% */
  vatPct: decimal("vatPct", { precision: 5, scale: 2 }).default("15.00").notNull(),
  vatAmount: decimal("vatAmount", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("ZAR").notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "invoiced"])
    .default("draft")
    .notNull(),
  notes: text("notes"),
  createdById: int("createdById").references(() => users.id),
  approvedById: int("approvedById").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobPricing = typeof jobPricing.$inferSelect;
export type InsertJobPricing = typeof jobPricing.$inferInsert;

// ─────────────────────────────────────────────
// JOB DOCUMENTS  (photos, PDFs, before/after images)
// ─────────────────────────────────────────────
export const jobDocuments = mysqlTable("jobDocuments", {
  id: int("id").autoincrement().primaryKey(),
  jobCardId: int("jobCardId")
    .notNull()
    .references(() => jobCards.id),
  category: mysqlEnum("category", ["photo", "document", "before_image", "after_image", "signature", "other"])
    .default("photo")
    .notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize"), // bytes
  /** Public S3 URL */
  fileUrl: text("fileUrl").notNull(),
  /** S3 key for deletion/management */
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  description: text("description"),
  uploadedById: int("uploadedById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobDocument = typeof jobDocuments.$inferSelect;
export type InsertJobDocument = typeof jobDocuments.$inferInsert;

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** Recipient user; null = owner/system notification */
  userId: int("userId").references(() => users.id),
  type: mysqlEnum("type", [
    "new_enquiry",
    "enquiry_assigned",
    "job_created",
    "job_assigned",
    "job_urgent",
    "job_started",
    "job_completed",
    "job_awaiting_pricing",
    "pricing_approved",
    "signature_captured",
    "general",
  ])
    .default("general")
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  /** Optional link to the related entity */
  entityType: varchar("entityType", { length: 50 }), // "job_card" | "enquiry" | "client"
  entityId: int("entityId"),
  isRead: boolean("isRead").default(false).notNull(),
  /** Whether owner push notification was sent */
  ownerNotified: boolean("ownerNotified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─────────────────────────────────────────────
// LOCAL CREDENTIALS  (email + bcrypt password)
// ─────────────────────────────────────────────
export const localCredentials = mysqlTable("localCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id),
  /** Normalised lowercase email used as login identifier */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** bcrypt hash (cost factor 12) */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  /** Require password change on next login (e.g. after admin reset) */
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  /** Incremented on each failed login; reset on success */
  failedAttempts: int("failedAttempts").default(0).notNull(),
  /** Locked until this timestamp after too many failures */
  lockedUntil: timestamp("lockedUntil"),
  lastPasswordChangedAt: timestamp("lastPasswordChangedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LocalCredential = typeof localCredentials.$inferSelect;
export type InsertLocalCredential = typeof localCredentials.$inferInsert;

// ─────────────────────────────────────────────
// AUTH AUDIT LOG
// ─────────────────────────────────────────────
export const authAuditLog = mysqlTable("authAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  /** Action performed */
  action: mysqlEnum("action", [
    "login_success",
    "login_failed",
    "logout",
    "register",
    "password_changed",
    "password_reset_requested",
    "role_changed",
    "account_locked",
    "account_unlocked",
    "invite_created",
    "invite_accepted",
  ]).notNull(),
  /** Email used in the attempt (useful for failed logins where userId may be unknown) */
  email: varchar("email", { length: 320 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 512 }),
  /** Extra context (e.g. previous role → new role for role_changed) */
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuthAuditLog = typeof authAuditLog.$inferSelect;
export type InsertAuthAuditLog = typeof authAuditLog.$inferInsert;

// ─────────────────────────────────────────────
// INVITE TOKENS  (admin-generated, single-use)
// ─────────────────────────────────────────────
export const inviteTokens = mysqlTable("inviteTokens", {
  id: int("id").autoincrement().primaryKey(),
  /** The signed token sent in the invite link */
  token: varchar("token", { length: 128 }).notNull().unique(),
  /** Pre-assigned email for the invitee */
  email: varchar("email", { length: 320 }).notNull(),
  /** Pre-assigned role */
  role: mysqlEnum("role", ["admin", "manager", "technician"]).notNull(),
  /** Optional pre-assigned department */
  departmentId: int("departmentId").references(() => departments.id),
  /** Who created the invite */
  createdById: int("createdById")
    .notNull()
    .references(() => users.id),
  /** When the invite expires */
  expiresAt: timestamp("expiresAt").notNull(),
  /** Whether the invite has been used */
  usedAt: timestamp("usedAt"),
  /** Which user accepted the invite */
  acceptedByUserId: int("acceptedByUserId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;

// ─────────────────────────────────────────────
// PRICING CATALOGUE  (admin-configurable quick-add items)
// ─────────────────────────────────────────────
export const pricingCatalogue = mysqlTable("pricingCatalogue", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["part", "service", "labour", "other"]).default("service").notNull(),
  /** Default price in ZAR (stored as decimal string for precision) */
  defaultPrice: varchar("defaultPrice", { length: 20 }).notNull().default("0.00"),
  /** Whether this item appears in the quick-add panel */
  isActive: boolean("isActive").default(true).notNull(),
  /** Controls display order in the quick-add panel */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdById: int("createdById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PricingCatalogueItem = typeof pricingCatalogue.$inferSelect;
export type InsertPricingCatalogueItem = typeof pricingCatalogue.$inferInsert;

// ─────────────────────────────────────────────
// CLIENT PORTAL TOKENS  (public read-only job status links)
// ─────────────────────────────────────────────
export const clientPortalTokens = mysqlTable("clientPortalTokens", {
  id: int("id").autoincrement().primaryKey(),
  /** The job card this token grants read-only access to */
  jobCardId: int("jobCardId").notNull().references(() => jobCards.id),
  /** Cryptographically random 32-byte hex token */
  token: varchar("token", { length: 64 }).notNull().unique(),
  /** Optional expiry — null means never expires */
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClientPortalToken = typeof clientPortalTokens.$inferSelect;
export type InsertClientPortalToken = typeof clientPortalTokens.$inferInsert;
