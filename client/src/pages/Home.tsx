import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  ClipboardList,
  Calendar,
  Package,
  PenLine,
  DollarSign,
  FolderOpen,
  Bell,
  ShieldCheck,
  Wrench,
  Lock,
  Cpu,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const API_MODULES = [
  {
    name: "Departments",
    route: "departments.*",
    icon: Building2,
    color: "bg-blue-500",
    endpoints: ["list", "get", "create", "update", "seed"],
    description: "Locksmithing, Security, Diagnostics, Workshop",
  },
  {
    name: "Users & Auth",
    route: "users.*",
    icon: Users,
    color: "bg-violet-500",
    endpoints: ["me", "list", "get", "update", "assignDepartment", "technicians"],
    description: "Role-based access: Admin, Manager, Technician",
  },
  {
    name: "Clients",
    route: "clients.*",
    icon: ShieldCheck,
    color: "bg-emerald-500",
    endpoints: ["list", "get", "create", "update", "deactivate"],
    description: "Client records with full contact management",
  },
  {
    name: "Enquiries",
    route: "enquiries.*",
    icon: ClipboardList,
    color: "bg-amber-500",
    endpoints: ["list", "get", "create", "update", "assign", "convertToJobCard", "close"],
    description: "Enquiry lifecycle with job card conversion",
  },
  {
    name: "Job Cards",
    route: "jobCards.*",
    icon: Wrench,
    color: "bg-orange-500",
    endpoints: ["list", "get", "create", "assign", "updateStatus", "update", "schedule"],
    description: "Full job lifecycle: pending → assigned → in-progress → completed → priced",
  },
  {
    name: "Scheduling",
    route: "scheduling.*",
    icon: Calendar,
    color: "bg-cyan-500",
    endpoints: ["generateSlots", "getSlots", "getAvailableSlots", "bookSlot", "releaseSlot", "setAvailability", "getAvailability", "updateAvailability", "deleteAvailability"],
    description: "45-minute time slots with employee availability tracking",
  },
  {
    name: "Job Items",
    route: "jobItems.*",
    icon: Package,
    color: "bg-pink-500",
    endpoints: ["list", "create", "update", "delete", "summary"],
    description: "Parts, services, and labour attached to job cards",
  },
  {
    name: "Signatures",
    route: "signatures.*",
    icon: PenLine,
    color: "bg-teal-500",
    endpoints: ["getByJobCard", "capture"],
    description: "Digital signature capture with S3 cloud storage",
  },
  {
    name: "Pricing",
    route: "pricing.*",
    icon: DollarSign,
    color: "bg-green-500",
    endpoints: ["getByJobCard", "create", "update", "submitForApproval", "approve", "markInvoiced"],
    description: "Job pricing with VAT, discounts, and approval workflow",
  },
  {
    name: "Documents",
    route: "documents.*",
    icon: FolderOpen,
    color: "bg-indigo-500",
    endpoints: ["list", "upload", "delete"],
    description: "Photos, documents, and before/after images via S3",
  },
  {
    name: "Notifications",
    route: "notifications.*",
    icon: Bell,
    color: "bg-red-500",
    endpoints: ["list", "listAll", "markRead", "markAllRead", "send"],
    description: "In-app and owner push notifications for critical events",
  },
];

const DEPARTMENTS = [
  { name: "Locksmithing", icon: Lock, desc: "Lock installation, repair, key cutting, emergency lockout" },
  { name: "Security", icon: ShieldCheck, desc: "CCTV, alarm systems, access control, security assessments" },
  { name: "Diagnostics", icon: Cpu, desc: "Vehicle diagnostics, transponder key programming, fault finding" },
  { name: "Workshop", icon: Wrench, desc: "In-house repairs, key duplication, safe servicing, hardware" },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">Houdini Locksmith</h1>
              <p className="text-xs text-slate-400 mt-0.5">& Security Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-24 bg-slate-800 animate-pulse rounded" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/50 text-amber-400 capitalize">
                  {user?.role}
                </Badge>
                <span className="text-sm text-slate-300">{user?.name}</span>
              </div>
            ) : (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Backend API — Fully Operational
          </div>
          <h2 className="text-4xl font-bold text-white">
            Job Card Management System
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            A complete backend for managing locksmith and security service operations — from client enquiries
            through job execution, digital signatures, and billing.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /> 12 database tables</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /> 11 API modules</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /> 42 tests passing</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" /> Role-based access control</span>
          </div>
        </section>

        {/* Departments */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">Service Departments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEPARTMENTS.map((dept) => (
              <Card key={dept.name} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <dept.icon className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-white text-base">{dept.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm">{dept.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Role Matrix */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">Role-Based Access Control</h3>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-2 pr-6 text-slate-400 font-medium">Capability</th>
                      <th className="text-center py-2 px-4 text-red-400 font-medium">Admin</th>
                      <th className="text-center py-2 px-4 text-blue-400 font-medium">Manager</th>
                      <th className="text-center py-2 px-4 text-green-400 font-medium">Technician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[
                      ["Manage users & roles", true, false, false],
                      ["Manage departments", true, false, false],
                      ["Create & manage clients", true, true, true],
                      ["Create & manage enquiries", true, true, true],
                      ["Convert enquiry to job card", true, true, false],
                      ["Create & assign job cards", true, true, false],
                      ["Update job status", true, true, true],
                      ["Manage scheduling & time slots", true, true, false],
                      ["Add job items (parts/services)", true, true, true],
                      ["Capture digital signatures", true, true, true],
                      ["Create & approve pricing", true, true, false],
                      ["Mark pricing as invoiced", true, false, false],
                      ["Upload job documents/photos", true, true, true],
                      ["View all notifications", true, false, false],
                      ["Send manual notifications", true, false, false],
                    ].map(([cap, admin, manager, tech]) => (
                      <tr key={String(cap)}>
                        <td className="py-2 pr-6 text-slate-300">{String(cap)}</td>
                        <td className="text-center py-2 px-4">{admin ? <span className="text-green-400">✓</span> : <span className="text-slate-700">—</span>}</td>
                        <td className="text-center py-2 px-4">{manager ? <span className="text-green-400">✓</span> : <span className="text-slate-700">—</span>}</td>
                        <td className="text-center py-2 px-4">{tech ? <span className="text-green-400">✓</span> : <span className="text-slate-700">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* API Modules */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">API Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {API_MODULES.map((mod) => (
              <Card key={mod.name} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-md ${mod.color} flex items-center justify-center flex-shrink-0`}>
                        <mod.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm">{mod.name}</CardTitle>
                        <code className="text-xs text-slate-500 font-mono">{mod.route}</code>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-slate-400 text-xs mt-1">{mod.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {mod.endpoints.map((ep) => (
                      <Badge key={ep} variant="secondary" className="bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700">
                        {ep}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Job Lifecycle */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">Job Card Lifecycle</h3>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {[
                  { label: "Enquiry", color: "bg-slate-700 text-slate-300" },
                  { label: "→", color: "text-slate-600" },
                  { label: "Job Card (Pending)", color: "bg-yellow-900/50 text-yellow-400 border border-yellow-800" },
                  { label: "→", color: "text-slate-600" },
                  { label: "Assigned", color: "bg-blue-900/50 text-blue-400 border border-blue-800" },
                  { label: "→", color: "text-slate-600" },
                  { label: "In Progress", color: "bg-orange-900/50 text-orange-400 border border-orange-800" },
                  { label: "→", color: "text-slate-600" },
                  { label: "Completed + Signed", color: "bg-green-900/50 text-green-400 border border-green-800" },
                  { label: "→", color: "text-slate-600" },
                  { label: "Awaiting Pricing", color: "bg-purple-900/50 text-purple-400 border border-purple-800" },
                  { label: "→", color: "text-slate-600" },
                  { label: "Priced", color: "bg-emerald-900/50 text-emerald-400 border border-emerald-800" },
                ].map((step, i) => (
                  step.label === "→"
                    ? <span key={i} className={step.color + " text-lg font-bold"}>{step.label}</span>
                    : <span key={i} className={`px-3 py-1.5 rounded-md text-xs font-medium ${step.color}`}>{step.label}</span>
                ))}
              </div>
              <Separator className="my-4 bg-slate-800" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-400">
                <div>
                  <p className="text-white font-medium mb-1">Signature Gate</p>
                  <p>Jobs requiring a signature cannot be marked complete until a digital signature is captured and stored in S3.</p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Pricing Gate</p>
                  <p>Pricing is only available after job completion. The approval workflow moves pricing from draft → pending → approved → invoiced.</p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Owner Notifications</p>
                  <p>Automated push notifications are sent to the business owner on new enquiries, urgent jobs, completions, and pricing approvals.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Scheduling */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-4">Scheduling System</h3>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-white font-medium mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    45-Minute Time Slots
                  </p>
                  <p className="text-slate-400 mb-3">
                    Slots are auto-generated from 08:00 to 18:00 (13 slots per day per technician).
                    Each slot is 45 minutes with no gaps between consecutive slots.
                  </p>
                  <div className="bg-slate-800 rounded-md p-3 font-mono text-xs text-slate-300 space-y-1">
                    {["08:00–08:45", "08:45–09:30", "09:30–10:15", "10:15–11:00", "11:00–11:45", "…", "17:00–17:45"].map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Employee Availability
                  </p>
                  <p className="text-slate-400">
                    Each technician can declare their availability per date with custom start/end times.
                    Availability records support reasons (leave, training, etc.) and conflict detection
                    prevents double-booking of time slots.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-800 mt-16 py-6 text-center text-slate-600 text-sm">
        Houdini Locksmith & Security — Management System v1.0
      </footer>
    </div>
  );
}
