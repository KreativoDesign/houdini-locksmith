import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Client,
  Department,
  EmployeeAvailability,
  Enquiry,
  InsertClient,
  InsertDepartment,
  InsertEmployeeAvailability,
  InsertEnquiry,
  InsertJobCard,
  InsertJobDocument,
  InsertJobItem,
  InsertJobPricing,
  InsertNotification,
  InsertSignature,
  InsertTimeSlot,
  InsertUser,
  JobCard,
  JobDocument,
  JobItem,
  JobPricing,
  Notification,
  Signature,
  TimeSlot,
  User,
  clients,
  departments,
  employeeAvailability,
  enquiries,
  jobCards,
  jobDocuments,
  jobItems,
  jobPricing,
  notifications,
  signatures,
  timeSlots,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Generate a sequential job number like JC-2024-0001 */
export async function generateJobNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(jobCards);
  const count = (result[0]?.count ?? 0) + 1;
  return `JC-${year}-${String(count).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "phone", "avatarUrl"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    (values as Record<string, unknown>)[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listUsers(filters?: { role?: User["role"]; departmentId?: number; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.role) conditions.push(eq(users.role, filters.role));
  if (filters?.departmentId) conditions.push(eq(users.departmentId, filters.departmentId));
  if (filters?.isActive !== undefined) conditions.push(eq(users.isActive, filters.isActive));
  return db.select().from(users).where(conditions.length ? and(...conditions) : undefined).orderBy(users.name);
}

export async function updateUser(id: number, data: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────

export async function listDepartments(): Promise<Department[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0];
}

export async function createDepartment(data: InsertDepartment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(data);
  return result[0].insertId;
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function seedDepartments(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(departments);
  if (existing.length > 0) return;
  await db.insert(departments).values([
    { name: "Locksmithing", description: "Lock installation, repair, key cutting, and emergency lockout services" },
    { name: "Security", description: "CCTV, alarm systems, access control, and security assessments" },
    { name: "Diagnostics", description: "Vehicle diagnostics, transponder key programming, and electronic fault finding" },
    { name: "Workshop", description: "In-house repairs, key duplication, safe servicing, and hardware maintenance" },
  ]);
}

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────

export async function createClient(data: InsertClient): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result[0].insertId;
}

export async function getClientById(id: number): Promise<Client | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function listClients(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    const like = `%${search}%`;
    return db.select().from(clients).where(
      or(
        sql`${clients.firstName} LIKE ${like}`,
        sql`${clients.lastName} LIKE ${like}`,
        sql`${clients.email} LIKE ${like}`,
        sql`${clients.phone} LIKE ${like}`,
      )
    ).orderBy(clients.lastName);
  }
  return db.select().from(clients).where(eq(clients.isActive, true)).orderBy(clients.lastName);
}

export async function updateClient(id: number, data: Partial<InsertClient>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

// ─────────────────────────────────────────────
// ENQUIRIES
// ─────────────────────────────────────────────

export async function createEnquiry(data: InsertEnquiry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(enquiries).values(data);
  return result[0].insertId;
}

export async function getEnquiryById(id: number): Promise<Enquiry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  return result[0];
}

export async function listEnquiries(filters?: {
  status?: Enquiry["status"];
  clientId?: number;
  departmentId?: number;
  assignedToId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(enquiries.status, filters.status));
  if (filters?.clientId) conditions.push(eq(enquiries.clientId, filters.clientId));
  if (filters?.departmentId) conditions.push(eq(enquiries.departmentId, filters.departmentId));
  if (filters?.assignedToId) conditions.push(eq(enquiries.assignedToId, filters.assignedToId));
  return db.select().from(enquiries).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(enquiries.createdAt));
}

export async function updateEnquiry(id: number, data: Partial<InsertEnquiry>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(enquiries).set(data).where(eq(enquiries.id, id));
}

// ─────────────────────────────────────────────
// JOB CARDS
// ─────────────────────────────────────────────

export async function createJobCard(data: InsertJobCard): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobCards).values(data);
  return result[0].insertId;
}

export async function getJobCardById(id: number): Promise<JobCard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobCards).where(eq(jobCards.id, id)).limit(1);
  return result[0];
}

export async function getJobCardByNumber(jobNumber: string): Promise<JobCard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobCards).where(eq(jobCards.jobNumber, jobNumber)).limit(1);
  return result[0];
}

export async function listJobCards(filters?: {
  status?: JobCard["status"];
  departmentId?: number;
  assignedTechnicianId?: number;
  clientId?: number;
  priority?: JobCard["priority"];
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(jobCards.status, filters.status));
  if (filters?.departmentId) conditions.push(eq(jobCards.departmentId, filters.departmentId));
  if (filters?.assignedTechnicianId) conditions.push(eq(jobCards.assignedTechnicianId, filters.assignedTechnicianId));
  if (filters?.clientId) conditions.push(eq(jobCards.clientId, filters.clientId));
  if (filters?.priority) conditions.push(eq(jobCards.priority, filters.priority));
  if (filters?.dateFrom) conditions.push(gte(jobCards.scheduledDate, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(jobCards.scheduledDate, filters.dateTo));
  return db.select().from(jobCards).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(jobCards.createdAt));
}

export async function updateJobCard(id: number, data: Partial<InsertJobCard>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobCards).set(data).where(eq(jobCards.id, id));
}

// ─────────────────────────────────────────────
// TIME SLOTS
// ─────────────────────────────────────────────

/** Generate 45-minute time slots for a technician on a given date (08:00–18:00) */
export function generate45MinSlots(slotDate: string, technicianId: number): InsertTimeSlot[] {
  const slots: InsertTimeSlot[] = [];
  let hour = 8;
  let minute = 0;
  while (hour < 18) {
    const startH = String(hour).padStart(2, "0");
    const startM = String(minute).padStart(2, "0");
    const startTime = `${startH}:${startM}`;
    let endMinute = minute + 45;
    let endHour = hour;
    if (endMinute >= 60) { endHour += 1; endMinute -= 60; }
    if (endHour > 18 || (endHour === 18 && endMinute > 0)) break;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
    slots.push({ slotDate, startTime, endTime, technicianId, isBooked: false });
    minute += 45;
    if (minute >= 60) { hour += 1; minute -= 60; }
  }
  return slots;
}

export async function createTimeSlotsForDay(slotDate: string, technicianId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already generated
  const existing = await db.select().from(timeSlots)
    .where(and(eq(timeSlots.slotDate, slotDate), eq(timeSlots.technicianId, technicianId)));
  if (existing.length > 0) return;
  const slots = generate45MinSlots(slotDate, technicianId);
  if (slots.length > 0) await db.insert(timeSlots).values(slots);
}

export async function getAvailableSlots(technicianId: number, slotDate: string): Promise<TimeSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeSlots).where(
    and(
      eq(timeSlots.technicianId, technicianId),
      eq(timeSlots.slotDate, slotDate),
      eq(timeSlots.isBooked, false),
    )
  ).orderBy(timeSlots.startTime);
}

export async function bookTimeSlot(slotId: number, jobCardId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const slot = await db.select().from(timeSlots).where(eq(timeSlots.id, slotId)).limit(1);
  if (!slot[0]) throw new Error("Time slot not found");
  if (slot[0].isBooked) throw new Error("Time slot is already booked");
  await db.update(timeSlots).set({ isBooked: true, jobCardId }).where(eq(timeSlots.id, slotId));
}

export async function releaseTimeSlot(slotId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeSlots).set({ isBooked: false, jobCardId: null }).where(eq(timeSlots.id, slotId));
}

export async function getSlotsByTechnicianAndDate(technicianId: number, slotDate: string): Promise<TimeSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeSlots).where(
    and(eq(timeSlots.technicianId, technicianId), eq(timeSlots.slotDate, slotDate))
  ).orderBy(timeSlots.startTime);
}

// ─────────────────────────────────────────────
// EMPLOYEE AVAILABILITY
// ─────────────────────────────────────────────

export async function setAvailability(data: InsertEmployeeAvailability): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeAvailability).values(data);
  return result[0].insertId;
}

export async function getAvailabilityByUserAndDate(userId: number, availableDate: string): Promise<EmployeeAvailability[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeeAvailability).where(
    and(eq(employeeAvailability.userId, userId), eq(employeeAvailability.availableDate, availableDate))
  );
}

export async function listAvailability(userId: number, fromDate?: string, toDate?: string): Promise<EmployeeAvailability[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(employeeAvailability.userId, userId)];
  if (fromDate) conditions.push(gte(employeeAvailability.availableDate, fromDate));
  if (toDate) conditions.push(lte(employeeAvailability.availableDate, toDate));
  return db.select().from(employeeAvailability).where(and(...conditions)).orderBy(employeeAvailability.availableDate);
}

export async function updateAvailability(id: number, data: Partial<InsertEmployeeAvailability>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employeeAvailability).set(data).where(eq(employeeAvailability.id, id));
}

export async function deleteAvailability(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employeeAvailability).where(eq(employeeAvailability.id, id));
}

// ─────────────────────────────────────────────
// JOB ITEMS
// ─────────────────────────────────────────────

export async function createJobItem(data: InsertJobItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobItems).values(data);
  return result[0].insertId;
}

export async function listJobItems(jobCardId: number): Promise<JobItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobItems).where(eq(jobItems.jobCardId, jobCardId)).orderBy(jobItems.createdAt);
}

export async function getJobItemById(id: number): Promise<JobItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobItems).where(eq(jobItems.id, id)).limit(1);
  return result[0];
}

export async function updateJobItem(id: number, data: Partial<InsertJobItem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobItems).set(data).where(eq(jobItems.id, id));
}

export async function deleteJobItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobItems).where(eq(jobItems.id, id));
}

// ─────────────────────────────────────────────
// SIGNATURES
// ─────────────────────────────────────────────

export async function createSignature(data: InsertSignature): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(signatures).values(data);
  return result[0].insertId;
}

export async function getSignatureByJobCard(jobCardId: number): Promise<Signature | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(signatures).where(eq(signatures.jobCardId, jobCardId)).limit(1);
  return result[0];
}

// ─────────────────────────────────────────────
// JOB PRICING
// ─────────────────────────────────────────────

export async function createJobPricing(data: InsertJobPricing): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobPricing).values(data);
  return result[0].insertId;
}

export async function getJobPricingByJobCard(jobCardId: number): Promise<JobPricing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobPricing).where(eq(jobPricing.jobCardId, jobCardId)).limit(1);
  return result[0];
}

export async function updateJobPricing(id: number, data: Partial<InsertJobPricing>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobPricing).set(data).where(eq(jobPricing.id, id));
}

// ─────────────────────────────────────────────
// JOB DOCUMENTS
// ─────────────────────────────────────────────

export async function createJobDocument(data: InsertJobDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobDocuments).values(data);
  return result[0].insertId;
}

export async function listJobDocuments(jobCardId: number, category?: JobDocument["category"]): Promise<JobDocument[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(jobDocuments.jobCardId, jobCardId)];
  if (category) conditions.push(eq(jobDocuments.category, category));
  return db.select().from(jobDocuments).where(and(...conditions)).orderBy(jobDocuments.createdAt);
}

export async function getJobDocumentById(id: number): Promise<JobDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobDocuments).where(eq(jobDocuments.id, id)).limit(1);
  return result[0];
}

export async function deleteJobDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobDocuments).where(eq(jobDocuments.id, id));
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function listNotifications(userId?: number, unreadOnly = false): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (userId) conditions.push(eq(notifications.userId, userId));
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db.select().from(notifications).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}
