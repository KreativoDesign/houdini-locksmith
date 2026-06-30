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
  InsertPricingCatalogueItem,
  PricingCatalogueItem,
  ClientPortalToken,
  InsertClientPortalToken,
  PushSubscriptionRow,
  InsertPushSubscriptionRow,
  Quote,
  InsertQuote,
  QuoteItem,
  InsertQuoteItem,
  QuoteToken,
  InsertQuoteToken,
  clientPortalTokens,
  clients,
  departments,
  employeeAvailability,
  enquiries,
  jobCards,
  jobDocuments,
  jobItems,
  jobPricing,
  notifications,
  pricingCatalogue,
  quotes,
  quoteItems,
  quoteTokens,
  signatures,
  timeSlots,
  users,
  pushSubscriptions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { and, desc, eq, gte, lte, inArray, sql } from "drizzle-orm";

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
  const lastJob = await db
    .select()
    .from(jobCards)
    .orderBy(desc(jobCards.id))
    .limit(1);
  const lastNum = lastJob[0]?.jobNumber?.split("-").pop() || "0";
  const nextNum = String(parseInt(lastNum) + 1).padStart(4, "0");
  const year = new Date().getFullYear();
  return `JC-${year}-${nextNum}`;
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function createUser(data: InsertUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(data);
  return result[0]?.insertId || 0;
}

export async function updateUser(id: number, data: Partial<InsertUser>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function listUsers(filters?: {
  role?: User["role"];
  departmentId?: number;
  isActive?: boolean;
}): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.role) conditions.push(eq(users.role, filters.role));
  if (filters?.departmentId) conditions.push(eq(users.departmentId, filters.departmentId));
  if (filters?.isActive !== undefined) conditions.push(eq(users.isActive, filters.isActive));
  return db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(users.name);
}

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────

export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return result[0];
}

export async function createDepartment(data: InsertDepartment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(data);
  return result[0]?.insertId || 0;
}

export async function listDepartments(): Promise<Department[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────

export async function getClientById(id: number): Promise<Client | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result[0]?.insertId || 0;
}

export async function updateClient(id: number, data: Partial<InsertClient>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function listClients(filters?: {
  isActive?: boolean;
  search?: string;
}): Promise<Client[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.isActive !== undefined) conditions.push(eq(clients.isActive, filters.isActive));
  return db
    .select()
    .from(clients)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(clients.firstName, clients.lastName);
}

// ─────────────────────────────────────────────
// ENQUIRIES
// ─────────────────────────────────────────────

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
  serviceType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [];
  // Exclude archived enquiries by default
  if (!filters?.includeArchived) {
    conditions.push(eq(enquiries.archived, false));
  }
  if (filters?.status) conditions.push(eq(enquiries.status, filters.status as Enquiry['status']));
  if (filters?.clientId) conditions.push(eq(enquiries.clientId, filters.clientId));
  if (filters?.departmentId) conditions.push(eq(enquiries.departmentId, filters.departmentId));
  if (filters?.assignedToId) conditions.push(eq(enquiries.assignedToId, filters.assignedToId));
  if (filters?.serviceType) conditions.push(eq(enquiries.serviceType, filters.serviceType as any));
  
  // Fetch raw enquiries first
  const enquiryRows = await db
    .select()
    .from(enquiries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(enquiries.createdAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
  
  // Enrich with client and assigned user names
  const enriched = await Promise.all(
    enquiryRows.map(async (enquiry) => {
      let clientFirstName = "";
      let clientLastName = "";
      let clientPhone = "";
      let assignedToName = "Unassigned";
      
      // Fetch client details
      if (enquiry.clientId) {
        const client = await db.select().from(clients).where(eq(clients.id, enquiry.clientId)).limit(1);
        if (client.length > 0) {
          clientFirstName = client[0].firstName || "";
          clientLastName = client[0].lastName || "";
          clientPhone = client[0].phone || "";
        }
      }
      
      // Fetch assigned user name
      if (enquiry.assignedToId) {
        const user = await db.select().from(users).where(eq(users.id, enquiry.assignedToId)).limit(1);
        if (user.length > 0) {
          assignedToName = `${user[0].firstName || ""} ${user[0].lastName || ""}`.trim();
        }
      }
      
      return {
        ...enquiry,
        clientFirstName,
        clientLastName,
        clientPhone,
        assignedToName,
      };
    })
  );
  
  return enriched;
}

export async function getEnquiryWithDetails(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: enquiries.id,
      clientId: enquiries.clientId,
      departmentId: enquiries.departmentId,
      subject: enquiries.subject,
      description: enquiries.description,
      status: enquiries.status,
      priority: enquiries.priority,
      source: enquiries.source,
      serviceType: enquiries.serviceType,
      assignedToId: enquiries.assignedToId,
      convertedToJobCardId: enquiries.convertedToJobCardId,
      notes: enquiries.notes,
      createdAt: enquiries.createdAt,
      updatedAt: enquiries.updatedAt,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
      clientPhone: clients.phone,
      clientEmail: clients.email,
      clientAddress: clients.address,
      clientCity: clients.city,
      departmentName: departments.name,
      assignedToName: users.name,
    })
    .from(enquiries)
    .leftJoin(clients, eq(enquiries.clientId, clients.id))
    .leftJoin(departments, eq(enquiries.departmentId, departments.id))
    .leftJoin(users, eq(enquiries.assignedToId, users.id))
    .where(eq(enquiries.id, id))
    .limit(1);
  return result[0];
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
  return result[0]?.insertId || 0;
}

export async function getJobCardById(id: number): Promise<JobCard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobCards).where(eq(jobCards.id, id)).limit(1);
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

/** List job cards with enriched data (client, department, technician, enquiry employee) */
export async function listJobCardsWithDetails(filters?: {
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
  
  // Fetch job cards with basic joins
  const results = await db
    .select({
      // Job card fields
      id: jobCards.id,
      jobNumber: jobCards.jobNumber,
      clientId: jobCards.clientId,
      enquiryId: jobCards.enquiryId,
      departmentId: jobCards.departmentId,
      assignedTechnicianId: jobCards.assignedTechnicianId,
      assignedManagerId: jobCards.assignedManagerId,
      title: jobCards.title,
      description: jobCards.description,
      status: jobCards.status,
      priority: jobCards.priority,
      scheduledDate: jobCards.scheduledDate,
      scheduledTimeSlotId: jobCards.scheduledTimeSlotId,
      startedAt: jobCards.startedAt,
      completedAt: jobCards.completedAt,
      technicianNotes: jobCards.technicianNotes,
      managerNotes: jobCards.managerNotes,
      requiresSignature: jobCards.requiresSignature,
      isSigned: jobCards.isSigned,
      createdAt: jobCards.createdAt,
      updatedAt: jobCards.updatedAt,
      // Client fields
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
      clientEmail: clients.email,
      clientPhone: clients.phone,
      // Department fields
      departmentName: departments.name,
      // Technician fields
      technicianName: users.name,
      technicianEmail: users.email,
      // Enquiry fields
      enquiryAssignedToId: enquiries.assignedToId,
    })
    .from(jobCards)
    .leftJoin(clients, eq(jobCards.clientId, clients.id))
    .leftJoin(departments, eq(jobCards.departmentId, departments.id))
    .leftJoin(users, eq(jobCards.assignedTechnicianId, users.id))
    .leftJoin(enquiries, eq(jobCards.enquiryId, enquiries.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobCards.createdAt));
  
  // Fetch enquiry employees separately to avoid alias conflicts
  const enquiryEmployeeIds = [...new Set(results.map(r => r.enquiryAssignedToId).filter(Boolean))];
  const enquiryEmployees: Record<number, User | undefined> = {};
  
  if (enquiryEmployeeIds.length > 0) {
    const employees = await db.select().from(users).where(
      inArray(users.id, enquiryEmployeeIds as number[])
    );
    employees.forEach(emp => {
      enquiryEmployees[emp.id] = emp;
    });
  }
  
  return results.map((row: any) => {
    const enquiryEmployee = row.enquiryAssignedToId ? enquiryEmployees[row.enquiryAssignedToId] : undefined;
    return {
      ...row,
      clientName: row.clientFirstName && row.clientLastName 
        ? `${row.clientFirstName} ${row.clientLastName}`.trim() 
        : null,
      enquiryTakenByName: enquiryEmployee?.name ?? null,
      enquiryTakenByEmail: enquiryEmployee?.email ?? null,
    };
  });
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

export async function getSlotById(slotId: number): Promise<TimeSlot | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(timeSlots).where(eq(timeSlots.id, slotId)).limit(1);
  return result[0];
}

export async function bookTimeSlot(slotId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeSlots).set({ isBooked: true }).where(eq(timeSlots.id, slotId));
}

// ─────────────────────────────────────────────
// JOB ITEMS
// ─────────────────────────────────────────────

export async function createJobItem(data: InsertJobItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobItems).values(data);
  return result[0]?.insertId || 0;
}

export async function listJobItems(jobCardId: number): Promise<JobItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobItems).where(eq(jobItems.jobCardId, jobCardId));
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
// JOB DOCUMENTS
// ─────────────────────────────────────────────

export async function createJobDocument(data: InsertJobDocument): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobDocuments).values(data);
  return result[0]?.insertId || 0;
}

export async function listJobDocuments(jobCardId: number): Promise<JobDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobDocuments).where(eq(jobDocuments.jobCardId, jobCardId));
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────

export async function createJobPricing(data: InsertJobPricing): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobPricing).values(data);
  return result[0]?.insertId || 0;
}

export async function getJobPricing(jobCardId: number): Promise<JobPricing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(jobPricing)
    .where(eq(jobPricing.jobCardId, jobCardId))
    .limit(1);
  return result[0];
}

export async function updateJobPricing(id: number, data: Partial<InsertJobPricing>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobPricing).set(data).where(eq(jobPricing.id, id));
}

export async function listPricingCatalogueItems(): Promise<PricingCatalogueItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingCatalogue).orderBy(pricingCatalogue.category);
}

export async function createPricingCatalogueItem(data: InsertPricingCatalogueItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricingCatalogue).values(data);
  return result[0]?.insertId || 0;
}

// ─────────────────────────────────────────────
// SIGNATURES
// ─────────────────────────────────────────────

export async function getSignatureByJobCard(jobCardId: number): Promise<Signature | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(signatures)
    .where(eq(signatures.jobCardId, jobCardId))
    .limit(1);
  return result[0];
}

export async function createSignature(data: InsertSignature): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(signatures).values(data);
  return result[0]?.insertId || 0;
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0]?.insertId || 0;
}

export async function listNotifications(userId?: number): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(notifications.userId, userId)] : [];
  return db
    .select()
    .from(notifications)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notifications.createdAt));
}

// ─────────────────────────────────────────────
// EMPLOYEE AVAILABILITY
// ─────────────────────────────────────────────

export async function createEmployeeAvailability(data: InsertEmployeeAvailability): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeAvailability).values(data);
  return result[0]?.insertId || 0;
}

export async function listEmployeeAvailability(userId: number): Promise<EmployeeAvailability[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(employeeAvailability)
    .where(eq(employeeAvailability.userId, userId))
    .orderBy(employeeAvailability.dayOfWeek);
}

// ─────────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────────

export async function createQuote(data: InsertQuote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(data);
  return result[0]?.insertId || 0;
}

export async function getQuoteById(id: number): Promise<Quote | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return result[0];
}

export async function updateQuote(id: number, data: Partial<InsertQuote>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set(data).where(eq(quotes.id, id));
}

export async function listQuotes(filters?: {
  clientId?: number;
  status?: Quote['status'];
}): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.clientId) conditions.push(eq(quotes.clientId, filters.clientId));
  if (filters?.status) conditions.push(eq(quotes.status, filters.status));
  return db.select().from(quotes).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(quotes.createdAt));
}

export async function listQuotesByClient(clientId: number): Promise<Quote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotes).where(eq(quotes.clientId, clientId)).orderBy(desc(quotes.createdAt));
}

export async function createQuoteItem(data: InsertQuoteItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quoteItems).values(data);
  return result[0]?.insertId || 0;
}

export async function listQuoteItems(quoteId: number): Promise<QuoteItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
}

// ─────────────────────────────────────────────
// QUOTE TOKENS
// ─────────────────────────────────────────────

export async function createQuoteToken(data: InsertQuoteToken): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quoteTokens).values(data);
  return result[0]?.insertId || 0;
}

export async function getQuoteTokenByToken(token: string): Promise<QuoteToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quoteTokens).where(eq(quoteTokens.token, token)).limit(1);
  return result[0];
}

// ─────────────────────────────────────────────
// CLIENT PORTAL TOKENS
// ─────────────────────────────────────────────

export async function createClientPortalToken(data: InsertClientPortalToken): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientPortalTokens).values(data);
  return result[0]?.insertId || 0;
}

export async function getClientPortalTokenByToken(token: string): Promise<ClientPortalToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, token))
    .limit(1);
  return result[0];
}

// ─────────────────────────────────────────────
// PUSH SUBSCRIPTIONS
// ─────────────────────────────────────────────

export async function createPushSubscription(data: InsertPushSubscriptionRow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pushSubscriptions).values(data);
  return result[0]?.insertId || 0;
}

export async function getPushSubscriptionsByUserId(userId: number): Promise<PushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscription(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}


// ─────────────────────────────────────────────
// MISSING HELPER FUNCTIONS
// ─────────────────────────────────────────────

export async function seedDepartments(depts?: InsertDepartment[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const defaultDepts: InsertDepartment[] = depts || [
    { name: "Locksmith Services", description: "General locksmith services" },
    { name: "Security Systems", description: "Security system installation and maintenance" },
    { name: "Emergency Services", description: "24/7 emergency locksmith services" },
    { name: "Commercial", description: "Commercial lock and security solutions" },
  ];
  
  for (const dept of defaultDepts) {
    const existing = await db.select().from(departments).where(eq(departments.name, dept.name)).limit(1);
    if (!existing.length) {
      await db.insert(departments).values(dept);
    }
  }
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function countClients(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql`COUNT(*)` }).from(clients);
  return (result[0]?.count as number) || 0;
}

export async function getClientWithEnquiries(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const client = await getClientById(id);
  if (!client) return undefined;
  const enquiryList = await listEnquiries({ clientId: id });
  return {
    ...client,
    enquiries: enquiryList,
  };
}

export async function upsertUser(data: InsertUser): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserByOpenId(data.openId);
  if (existing) {
    await updateUser(existing.id, data);
    return existing.id;
  }
  return createUser(data);
}

export async function getBookedSlotsForDate(slotDate: string): Promise<TimeSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeSlots).where(
    and(
      eq(timeSlots.slotDate, slotDate),
      eq(timeSlots.isBooked, true)
    )
  ).orderBy(timeSlots.startTime);
}

export async function getSlotsByTechnicianAndDate(technicianId: number, slotDate: string): Promise<TimeSlot[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeSlots).where(
    and(
      eq(timeSlots.technicianId, technicianId),
      eq(timeSlots.slotDate, slotDate)
    )
  ).orderBy(timeSlots.startTime);
}

export async function deleteSignatureByJobCard(jobCardId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(signatures).where(eq(signatures.jobCardId, jobCardId));
}


export async function createEnquiry(data: InsertEnquiry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(enquiries).values(data);
  return result[0]?.insertId || 0;
}

export async function countEnquiries(filters?: {
  status?: Enquiry["status"];
  clientId?: number;
  departmentId?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [];
  if (filters?.status) conditions.push(eq(enquiries.status, filters.status));
  if (filters?.clientId) conditions.push(eq(enquiries.clientId, filters.clientId));
  if (filters?.departmentId) conditions.push(eq(enquiries.departmentId, filters.departmentId));
  const result = await db.select({ count: sql`COUNT(*)` }).from(enquiries).where(
    conditions.length ? and(...conditions) : undefined
  );
  return (result[0]?.count as number) || 0;
}

export async function getPushSubscriptionsForUserIds(userIds: number[]): Promise<PushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];
  if (userIds.length === 0) return [];
  return db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

export async function deleteAvailability(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employeeAvailability).where(eq(employeeAvailability.id, id));
}

export async function listAvailability(userId: number): Promise<EmployeeAvailability[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(employeeAvailability).where(eq(employeeAvailability.userId, userId)).orderBy(employeeAvailability.dayOfWeek);
}

export async function releaseTimeSlot(slotId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeSlots).set({ isBooked: false }).where(eq(timeSlots.id, slotId));
}


export async function setAvailability(data: InsertEmployeeAvailability): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeAvailability).values(data);
  return result[0]?.insertId || 0;
}

export async function updateAvailability(id: number, data: Partial<InsertEmployeeAvailability>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employeeAvailability).set(data).where(eq(employeeAvailability.id, id));
}

export async function getJobItemById(id: number): Promise<JobItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobItems).where(eq(jobItems.id, id)).limit(1);
  return result[0];
}

export async function getJobPricingByJobCard(jobCardId: number): Promise<JobPricing | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobPricing).where(eq(jobPricing.jobCardId, jobCardId)).limit(1);
  return result[0];
}

export async function deleteJobDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobDocuments).where(eq(jobDocuments.id, id));
}

export async function getJobDocumentById(id: number): Promise<JobDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobDocuments).where(eq(jobDocuments.id, id)).limit(1);
  return result[0];
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

export async function createCatalogueItem(data: InsertPricingCatalogueItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pricingCatalogue).values(data);
  return result[0]?.insertId || 0;
}

export async function getCatalogueItemById(id: number): Promise<PricingCatalogueItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricingCatalogue).where(eq(pricingCatalogue.id, id)).limit(1);
  return result[0];
}

export async function deleteCatalogueItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pricingCatalogue).where(eq(pricingCatalogue.id, id));
}

export async function listCatalogueItems(category?: string): Promise<PricingCatalogueItem[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = category ? [eq(pricingCatalogue.category, category)] : [];
  return db.select().from(pricingCatalogue).where(
    conditions.length ? and(...conditions) : undefined
  ).orderBy(pricingCatalogue.category, pricingCatalogue.name);
}


export async function updateCatalogueItem(id: number, data: Partial<InsertPricingCatalogueItem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricingCatalogue).set(data).where(eq(pricingCatalogue.id, id));
}

export async function seedDefaultCatalogueItems(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const defaultItems: InsertPricingCatalogueItem[] = [
    { category: "Locks", name: "Standard Lock", price: 50, description: "Standard door lock" },
    { category: "Locks", name: "Smart Lock", price: 150, description: "Electronic smart lock" },
    { category: "Services", name: "Lock Installation", price: 75, description: "Professional lock installation" },
    { category: "Services", name: "Emergency Lockout", price: 100, description: "24/7 emergency lockout service" },
  ];
  
  for (const item of defaultItems) {
    const existing = await db.select().from(pricingCatalogue).where(eq(pricingCatalogue.name, item.name)).limit(1);
    if (!existing.length) {
      await db.insert(pricingCatalogue).values(item);
    }
  }
}

export async function getClientPortalToken(token: string): Promise<ClientPortalToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientPortalTokens).where(eq(clientPortalTokens.token, token)).limit(1);
  return result[0];
}

export async function getClientPortalTokenByJobCard(jobCardId: number): Promise<ClientPortalToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientPortalTokens).where(eq(clientPortalTokens.jobCardId, jobCardId)).limit(1);
  return result[0];
}

export async function upsertClientPortalToken(data: InsertClientPortalToken): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getClientPortalTokenByJobCard(data.jobCardId);
  if (existing) {
    await db.update(clientPortalTokens).set(data).where(eq(clientPortalTokens.id, existing.id));
    return existing.id;
  }
  return createClientPortalToken(data);
}

export async function upsertPushSubscription(data: InsertPushSubscriptionRow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(pushSubscriptions).where(
    and(
      eq(pushSubscriptions.userId, data.userId),
      eq(pushSubscriptions.endpoint, data.endpoint)
    )
  ).limit(1);
  if (existing.length > 0) {
    await db.update(pushSubscriptions).set(data).where(eq(pushSubscriptions.id, existing[0].id));
    return existing[0].id;
  }
  return createPushSubscription(data);
}


export async function getPushSubscriptionsForUser(userId: number): Promise<PushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function generateQuoteNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lastQuote = await db.select().from(quotes).orderBy(desc(quotes.id)).limit(1);
  const lastNum = lastQuote[0]?.quoteNumber?.split("-").pop() || "0";
  const nextNum = String(parseInt(lastNum) + 1).padStart(4, "0");
  const year = new Date().getFullYear();
  return `QT-${year}-${nextNum}`;
}

export async function getQuoteItemsByQuoteId(quoteId: number): Promise<QuoteItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
}

export async function getQuoteTokenByQuoteId(quoteId: number): Promise<QuoteToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quoteTokens).where(eq(quoteTokens.quoteId, quoteId)).limit(1);
  return result[0];
}

export async function upsertQuoteToken(data: InsertQuoteToken): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getQuoteTokenByQuoteId(data.quoteId);
  if (existing) {
    await db.update(quoteTokens).set(data).where(eq(quoteTokens.id, existing.id));
    return existing.id;
  }
  return createQuoteToken(data);
}

export async function deleteQuoteItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quoteItems).where(eq(quoteItems.id, id));
}

export async function updateQuoteItem(id: number, data: Partial<InsertQuoteItem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quoteItems).set(data).where(eq(quoteItems.id, id));
}
