# Houdini Locksmith & Security — Project TODO

## Phase 1: Database Schema
- [x] Extend users table with role (admin/manager/technician), departmentId, phone, avatar
- [x] Create departments table (Locksmithing, Security, Diagnostics, Workshop)
- [x] Create clients table with contact details
- [x] Create enquiries table with status tracking
- [x] Create jobCards table with full lifecycle fields
- [x] Create timeSlots table (45-minute intervals)
- [x] Create employeeAvailability table
- [x] Create jobItems table (parts/services per job card)
- [x] Create signatures table linked to job cards
- [x] Create jobPricing table
- [x] Create jobDocuments table (S3 file references)
- [x] Create notifications table
- [x] Push all migrations with pnpm db:push

## Phase 2: Authentication & RBAC
- [x] Extend user upsert to include role and department
- [x] Implement adminProcedure, managerProcedure, technicianProcedure middleware
- [x] User list/get/update/assign-department endpoints (admin only)
- [x] Department CRUD endpoints

## Phase 3: Client & Enquiry Module
- [x] Client CRUD endpoints (create, list, get, update)
- [x] Enquiry CRUD endpoints (create, list, get, update, delete)
- [x] Enquiry status transitions (new → in-review → converted / closed)
- [x] Enquiry-to-job-card conversion endpoint
- [x] Owner notification on new enquiry submission

## Phase 4: Job Card Module
- [x] Job card create endpoint (from enquiry or direct)
- [x] Job card list with filters (status, department, technician, date)
- [x] Job card get by ID with full relations
- [x] Job card update (status, assignment, notes)
- [x] Job card status transitions (pending → assigned → in-progress → completed → priced)
- [x] Assign technician to job card
- [x] Owner notification when job marked urgent
- [x] Owner notification when job completed and awaiting pricing

## Phase 5: Scheduling Module
- [x] Time slot generation (45-minute intervals, 08:00–18:00)
- [x] Employee availability CRUD
- [x] Available slots query by technician and date
- [x] Book time slot for job card
- [x] Conflict detection for double-booking

## Phase 6: Job Items Module
- [x] Job item create (part/service linked to job card)
- [x] Job item list by job card
- [x] Job item update (quantity, price)
- [x] Job item delete

## Phase 7: Signatures Module
- [x] Signature upload endpoint (base64 data URL → S3)
- [x] Signature get by job card
- [x] Signature verification status

## Phase 8: Job Pricing Module
- [x] Pricing create/update (labour, parts, VAT, discount, total)
- [x] Pricing get by job card
- [x] Pricing approval workflow (draft → approved)
- [x] Owner notification on pricing approval

## Phase 9: File Storage Module
- [x] Upload job document/photo to S3 (organized by jobCardId)
- [x] List documents by job card
- [x] Delete document
- [x] Support categories: signature, photo, document, before_after

## Phase 10: Notifications Module
- [x] Internal notification create/list/mark-read
- [x] Owner push notification integration
- [x] Notification triggers wired to all critical events

## Phase 11: Tests & Seed Data
- [x] Seed departments (4 fixed departments)
- [x] Vitest tests for auth RBAC middleware
- [x] Vitest tests for enquiry-to-job-card conversion
- [x] Vitest tests for scheduling conflict detection
- [x] Vitest tests for pricing calculation

## Phase 12: Frontend (Minimal API Explorer)
- [x] Clean landing page showing system status and API overview

## Phase 13: Auth & RBAC System (Full Implementation)

### Database
- [x] localCredentials table (bcrypt hash, failed attempts, lockout, mustChangePassword)
- [x] authAuditLog table (action, email, ipAddress, userAgent, metadata)
- [x] inviteTokens table (token, email, role, expiresAt, usedAt)

### Auth Service
- [x] bcrypt password hashing (cost factor 12)
- [x] JWT session token creation and verification (HS256, 7-day expiry)
- [x] Account lockout after 5 failed attempts (15-minute window)
- [x] Invite token generation (32-byte hex, 48-hour expiry, single-use)
- [x] Audit log writer (all auth events)

### API Endpoints
- [x] auth.login endpoint (email + password)
- [x] auth.register endpoint (with optional invite token)
- [x] auth.logout (clears both OAuth and local session cookies)
- [x] auth.changePassword (self-service)
- [x] auth.createInvite (admin only)
- [x] auth.updateUserRole (admin only)
- [x] auth.unlockAccount (admin only)
- [x] auth.resetPassword (admin only)
- [x] auth.auditLog (admin sees all, manager sees own)
- [x] auth.listUsersWithCredentials (manager+)
- [x] auth.validateInvite (public, used on register page)

### Frontend
- [x] Login page with email/password form, show/hide password, error states
- [x] Register page with invite token support, password strength hints
- [x] AppShell component (role-aware sidebar, resizable, collapsible)
- [x] Admin dashboard (stats, recent jobs, team overview, quick actions)
- [x] Manager dashboard (awaiting pricing, open enquiries, quick actions)
- [x] Technician dashboard (assigned jobs only, urgent alerts)
- [x] Team Management page (user list, role change, invite dialog, unlock)
- [x] Audit Log page (all auth events with icons)
- [x] Change Password page (self-service with strength hints)
- [x] ProtectedRoute guard (redirects unauthenticated users to /login)
- [x] Role-based route guards (wrong role redirected to own dashboard)
- [x] DashboardRedirect (/ and /dashboard → role-specific dashboard)
- [x] AuthRoute guard (authenticated users redirected away from /login)

### Tests
- [x] 33 RBAC tests (adminProcedure, managerProcedure, protectedProcedure)
- [x] Updated logout tests (2 cookies cleared)
- [x] Input validation tests (login, register)
- [x] All 75 tests passing

## Bug Fixes
- [x] Fix login/registration flow — context.ts now reads local auth cookie (app_session_id) alongside Manus OAuth cookie; first-user bootstrap ensures first registration gets admin role; failed attempts counter reset

## Phase 14: Enquiry CRM Module

### API Enhancements
- [x] Validate and harden clients router (full CRUD, search, pagination)
- [x] Validate and harden enquiries router (full CRUD, filters, pagination)
- [x] Ensure enquiry-to-job-card conversion preserves all enquiry data
- [x] Add serviceType enum validation on enquiries

### Frontend — Clients
- [x] Clients list page (table with search, filter by status, pagination)
- [x] Client detail page (info card + enquiry history)
- [x] Create/edit client dialog (name, email, phone, address)
- [x] Deactivate client action

### Frontend — Enquiries
- [x] Enquiries list page (table with status filter, service type filter, search)
- [x] Enquiry detail page (full info, status badge, linked client, convert button)
- [x] Create enquiry form (client picker, service type, description, priority)
- [x] Edit enquiry form (update fields, change status)
- [x] Status badge component (open/in-review/converted/closed)

### Frontend — Conversion Flow
- [x] Convert to Job Card button (admin/manager only)
- [x] Conversion confirmation dialog (shows preserved data preview)
- [x] Post-conversion redirect to new job card
- [x] Enquiry marked as converted with link to job card

## Phase 15: Departments Management UI
- [x] Departments page — list all 4 departments with member count and active job count
- [x] Department card — show name, description, member list with avatars
- [x] Assign technician to department — dialog picker with all users
- [x] Remove technician from department (X button on member row)
- [x] Unassigned users panel — quick-assign dropdown per user
- [x] Team Management user row — department dropdown wired (users.update)
- [x] App.tsx route /departments wired to Departments page (admin only)
- [x] TypeScript clean (0 errors), 75 tests passing

## Phase 16: Job Cards Module UI
- [x] JobCards list page — table view with status/dept/tech filters and search
- [x] Kanban board view — 6 status columns (Pending/Assigned/In Progress/On Hold/Awaiting Pricing/Priced)
- [x] Toggle between table and Kanban view
- [x] JobCard detail page — full info, status badge, client/enquiry links
- [x] Inline technician assignment dropdown on detail page
- [x] Status transition buttons (role-aware: tech can progress, manager/admin can do all)
- [x] Priority badge (low/medium/high/urgent) with colour coding
- [x] 45-minute scheduling slot picker component
- [x] Slot picker shows available slots for selected technician and date
- [x] Book/release slot from job card detail page
- [x] Job items panel — list of parts/services with qty, unit price, line total
- [x] Add job item dialog (name, type, qty, unit price, discount %)
- [x] Edit/delete job item inline
- [x] Job items subtotal displayed on detail page (parts/labour/services breakdown)
- [x] Create job card form (direct creation, not from enquiry)
- [x] App.tsx routes wired: /jobs, /jobs/new, /jobs/:id
- [x] TypeScript clean (0 errors), 75 tests still passing

## Phase 17: Pricing Module UI
- [x] Pricing page — full form with labour, parts, VAT, discount, and live total calculation
- [x] Pricing status workflow: draft → pending_approval → approved → invoiced
- [x] Role-aware actions: Manager submits for approval, Admin approves
- [x] Invoice summary card with line-by-line breakdown
- [x] Job items auto-populated from existing job items on the card
- [x] Pricing entry point button on Job Card detail page (after completion)
- [x] Pricing badge on job card list showing pricing status
- [x] Route /pricing?jobCardId=:id wired in App.tsx
- [x] TypeScript clean (0 errors), 75 tests still passing

## Phase 18: Director UX Fixes (Bug Round 1)
- [ ] Enquiry form: new client vs existing client toggle (create inline or pick from dropdown)
- [ ] Enquiry form: add phone, address, email fields for new client creation
- [ ] Invite system: send invite via email, not just generate a link
- [ ] Job card: unit price field accepts decimal places (e.g. 99.99)
- [ ] Job card notes: show technician name in dropdown/label
- [ ] Job card notes: timestamp on each note entry
- [ ] Job card notes: fix save notes button (currently not saving)
- [ ] Job card status: fix invalid transition guard (in-progress → in-progress blocked correctly)
- [ ] Job card status: allow status update from job card detail page action buttons
- [ ] Kanban board: drag-and-drop cards between status columns
- [ ] Kanban board: status update fires when card is dropped into new column

## Phase 19: Digital Signature Capture UI
- [x] SignaturePad canvas component (touch + mouse drawing, clear, undo stroke)
- [x] Submit signature as base64 PNG to signatures.capture API → S3 upload
- [x] Signature display on job card detail (shows stored signature image from S3)
- [x] Completion gate: "Mark Completed" button only active after signature captured
- [x] Signature section visible on job card detail for in_progress/completed jobs
- [x] Signed-by name and timestamp displayed alongside signature
- [x] Re-sign option for admin/manager if signature needs to be replaced
- [x] TypeScript clean, 75 tests still passing

## Phase 20: Notifications Drawer & Password Policy
- [x] Notifications bell icon in AppShell top bar (mobile + desktop)
- [x] Unread count badge on bell icon (auto-refreshes every 30s)
- [x] Slide-out notifications drawer (Sheet component, right side)
- [x] Notification rows with type icons, colour coding, relative timestamps
- [x] Mark individual notification as read on click
- [x] Mark all as read button
- [x] Unread-only filter toggle
- [x] Clicking notification with entity link navigates to relevant page
- [x] Password policy updated: min 12 chars, uppercase, lowercase, number, special char
- [x] Password strength hints updated on Register and ChangePassword pages
- [x] Server-side validation updated (authService + auth router zod schemas)
- [x] TypeScript clean (0 errors), 75 tests still passing

## Phase 21: Signature Confirmation Dialog
- [x] After drawing, "Submit Signature" opens a preview dialog showing the captured image
- [x] Dialog has "Confirm & Upload" and "Re-draw" buttons
- [x] Confirming triggers the S3 upload; re-drawing returns to the canvas
- [x] TypeScript clean, 75 tests still passing

## Phase 22: Post-Signature Client Confirmation Email
- [x] Investigate available email sending infrastructure (Manus API Hub / built-in)
- [x] Install Resend SDK and configure RESEND_API_KEY + EMAIL_FROM secrets
- [x] Build sendSignatureConfirmationEmail helper (HTML email with signature image + job summary)
- [x] Wire email send into signatures.capture procedure after successful S3 upload
- [x] Gracefully handle missing client email (log warning, do not fail the capture)
- [x] Email failure is non-fatal — signature capture always succeeds regardless
- [x] Vitest tests: key configured, email validation guards, live API ping
- [x] TypeScript clean, 80 tests passing (5 new email tests)

## Phase 23: Job Card Detail Enhancements
- [x] Client info panel: full name, email, phone, alternate phone, address, city, postal code
- [x] Directions button: opens Google Maps with client address
- [x] Notes: save technician notes with timestamp per save (append history or last-saved-at)
- [x] Notes: save manager notes with timestamp
- [x] Notes: fix save button so changes persist to the database
- [x] Photo upload: upload images to S3 under jobs/{id}/photos/
- [x] Photo gallery: display uploaded images in a grid on the job card detail page
- [x] Photo delete: allow admin/manager to remove a photo
- [x] Quick-add pricing catalogue: predefined items (Labour, Call-out Fee, Gate Motor, etc.)
- [x] Quick-add: each catalogue item has a default price, editable before adding
- [x] Quick-add: generic/custom line item option still available
- [x] TypeScript clean, 80 tests still passing

## Phase 24: Admin-Configurable Pricing Catalogue
- [x] pricingCatalogue table: id, name, description, type (part/service/labour/other), defaultPrice, isActive, sortOrder, createdAt
- [x] Seed 8 default items (Call-out Fee, Labour/hr, Gate Motor, etc.) on first run
- [x] catalogue.list (public to technicians+), catalogue.create/update/delete (admin only)
- [x] Pricing Catalogue page under Settings (admin only) — table with inline edit/delete
- [x] Add item dialog: name, description, type, default price, active toggle
- [x] Reorder items via sort order field
- [x] Job card quick-add panel replaced with live catalogue query (falls back to empty state)
- [x] Inactive catalogue items hidden from quick-add but visible in admin settings
- [x] TypeScript clean, 80 tests still passing

## Phase 25: Group Quick-Add Panel by Type
- [x] Group catalogue items by type (Service, Labour, Part, Other) in the quick-add panel
- [x] Each group has a labelled section header with icon and item count
- [x] Groups are collapsible (click header to toggle)
- [x] Groups with zero active items are hidden
- [x] TypeScript clean, 80 tests still passing

## Phase 26: Quantity Selector in Quick-Add Panel
- [x] Per-item quantity state (default 1, min 0.5, step 0.5 for labour; min 1, step 1 for parts/services)
- [x] Compact − / qty / + spinner inline with each catalogue item row
- [x] Quantity resets to 1 after item is successfully added
- [x] handleQuickAdd passes the selected quantity to createMutation
- [x] TypeScript clean, 80 tests still passing

## Phase 27: Live Line Total in Quick-Add Panel
- [x] Show qty × price total (R xx.xx) next to each item's + button
- [x] Total updates live as qty or price changes
- [x] TypeScript clean, 80 tests still passing

## Phase 28: Job Card PDF Export
- [x] Install PDFKit for server-side PDF generation
- [x] Build generateJobCardPdf helper: company header, client info, job summary, line items table, photos, signature
- [x] tRPC procedure jobCards.generatePdf: generates PDF, uploads to S3, returns public URL
- [x] Download PDF button on job card detail page header (opens PDF in new tab)
- [x] TypeScript clean, 80 tests still passing

## Phase 29: Assignment Flow, Department Slot Picker & Signature Audit
- [x] Assignment: pending → assigned on first assignment; in_progress/on_hold preserved on reassignment
- [x] Assign dialog: technicians filtered by job card departmentId (users.technicians query)
- [x] Assign dialog: department name shown in description; empty state if no technicians in dept
- [x] Signature: fully confirmed end-to-end — canvas, preview dialog, S3 upload, isSigned flag, gating
- [x] Signature: signatures.replace procedure added for admin/manager re-sign
- [x] Signature: Re-sign button visible to manager/admin when signature already exists (non-closed jobs)
- [x] TypeScript clean (0 errors), 80 tests still passing

## Phase 30: Slot Picker Department Filter
- [x] SlotPicker: accepts optional departmentId and departmentName props
- [x] SlotPicker: fetches technicians filtered by departmentId via users.technicians query
- [x] SlotPicker: shows department name label above technician dropdown
- [x] SlotPicker: technician dropdown defaults to assigned technician, allows browsing others in dept
- [x] SlotPicker: assigned technician marked "(assigned)" in dropdown
- [x] JobCardDetail: passes job departmentId and departmentName into SlotPicker
- [x] TypeScript clean (0 errors), 80 tests still passing

## Phase 31: Slot Picker Conflict Warning
- [x] getBookedSlotsForDate db helper added to db.ts
- [x] scheduling.getBookingsForDate tRPC procedure added to scheduling router
- [x] SlotPicker: queries existing bookings when technician + date are selected
- [x] SlotPicker: yellow warning banner shows count and time ranges of conflicting bookings
- [x] SlotPicker: conflicting slots show linked job card ID (JC #N) for easy reference
- [x] Warning auto-clears when date or technician changes to a conflict-free selection
- [x] Current job's own slot excluded from conflict count
- [x] TypeScript clean (0 errors), 80 tests still passing

## Phase 32: Weekly Calendar View on Schedule Page
- [x] scheduling.getWeeklyBookings procedure: returns all booked slots for a date range, grouped by technician
- [x] Schedule page: department selector (defaults to first dept)
- [x] Schedule page: week navigation (prev/next week, "Today" button)
- [x] Weekly grid: columns = Mon–Sun, rows = technicians in selected dept
- [x] Each booked slot shown as a colour-coded chip with time range and job card ref
- [x] Clicking a chip navigates to the job card detail page
- [x] Empty cells show a subtle "—" to indicate no bookings
- [x] Conflict indicator (warning icon) on days with multiple bookings
- [x] Colour-coded legend per technician at the bottom of the page
- [x] TypeScript clean (0 errors), 80 tests still passing
