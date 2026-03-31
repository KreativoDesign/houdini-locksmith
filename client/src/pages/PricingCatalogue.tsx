import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit2,
  Package,
  Plus,
  Tag,
  Timer,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────────────────────
type ItemType = "part" | "service" | "labour" | "other";

const TYPE_LABELS: Record<ItemType, string> = {
  part: "Part",
  service: "Service",
  labour: "Labour",
  other: "Other",
};

const TYPE_ICONS: Record<ItemType, React.ElementType> = {
  part: Package,
  service: Wrench,
  labour: Timer,
  other: Tag,
};

const TYPE_COLORS: Record<ItemType, string> = {
  part: "bg-blue-100 text-blue-700 border-blue-200",
  service: "bg-green-100 text-green-700 border-green-200",
  labour: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

// ─── Form state ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  description: "",
  type: "service" as ItemType,
  defaultPrice: "0.00",
  isActive: true,
  sortOrder: "0",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PricingCataloguePage() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: items = [], isLoading } = trpc.catalogue.list.useQuery({ activeOnly: false });

  const createMutation = trpc.catalogue.create.useMutation({
    onSuccess: () => {
      toast.success("Catalogue item created");
      utils.catalogue.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.catalogue.update.useMutation({
    onSuccess: () => {
      toast.success("Catalogue item updated");
      utils.catalogue.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.catalogue.delete.useMutation({
    onSuccess: () => {
      toast.success("Catalogue item deleted");
      utils.catalogue.list.invalidate();
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.catalogue.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Item activated" : "Item deactivated");
      utils.catalogue.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      type: item.type,
      defaultPrice: parseFloat(item.defaultPrice).toFixed(2),
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      defaultPrice: parseFloat(form.defaultPrice) || 0,
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const activeCount = (items as any[]).filter((i: any) => i.isActive).length;
  const totalCount = (items as any[]).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Pricing Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the quick-add items available on job cards. Changes take effect immediately.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["service", "labour", "part", "other"] as ItemType[]).map((type) => {
          const Icon = TYPE_ICONS[type];
          const count = (items as any[]).filter((i: any) => i.type === type).length;
          return (
            <Card key={type} className="border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{type}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalCount} total items</span>
        <span>·</span>
        <span className="text-green-600 font-medium">{activeCount} active</span>
        {totalCount - activeCount > 0 && (
          <>
            <span>·</span>
            <span className="text-muted-foreground">{totalCount - activeCount} inactive</span>
          </>
        )}
      </div>

      {/* Items table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catalogue Items</CardTitle>
          <CardDescription>
            Active items appear in the quick-add panel on job cards. Inactive items are hidden from
            technicians but remain in the catalogue for future use.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading catalogue…</div>
          ) : (items as any[]).length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No catalogue items yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add first item
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {(items as any[]).map((item: any) => {
                const Icon = TYPE_ICONS[item.type as ItemType] ?? Tag;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                      item.isActive ? "" : "opacity-50 bg-muted/20"
                    }`}
                  >
                    {/* Icon */}
                    <div className="shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{item.name}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[item.type as ItemType]}`}
                        >
                          {TYPE_LABELS[item.type as ItemType]}
                        </Badge>
                        {!item.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">R {parseFloat(item.defaultPrice).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">default</p>
                    </div>

                    {/* Sort order */}
                    <div className="shrink-0 w-10 text-center">
                      <p className="text-xs text-muted-foreground">#{item.sortOrder}</p>
                    </div>

                    {/* Active toggle */}
                    <div className="shrink-0">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => toggleMutation.mutate({ id: item.id })}
                        disabled={toggleMutation.isPending}
                      />
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Catalogue Item" : "Add Catalogue Item"}</DialogTitle>
            <DialogDescription>
              {editItem
                ? "Update the details for this catalogue item."
                : "Add a new item to the quick-add pricing catalogue."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gate Motor Installation"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description shown to technicians"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ItemType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="part">Part</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Price (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultPrice}
                  onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Active</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.isActive ? "Visible to technicians" : "Hidden from quick-add"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={
                !form.name.trim() || createMutation.isPending || updateMutation.isPending
              }
              onClick={handleSubmit}
            >
              {editItem ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete catalogue item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item from the catalogue. Existing job card line items
              are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
