import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Loader2,
  Mail,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Clock, color: "bg-slate-100 text-slate-700" },
  sent: { label: "Sent", icon: Clock, color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", icon: Clock, color: "bg-orange-100 text-orange-700" },
};

interface EditedQuote {
  description?: string;
  discount: string;
  discountPercent: number;
  expiresAt?: Date;
  status: string;
}

interface EditedItem {
  id?: number;
  name: string;
  type: "part" | "service" | "labour" | "other";
  quantity: number;
  unitPrice: string;
  discountPercent: number;
}

export default function QuoteDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id || "0", 10);

  const [isEditing, setIsEditing] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);

  const [editedQuote, setEditedQuote] = useState<EditedQuote>({
    description: "",
    discount: "0.00",
    discountPercent: 0,
    expiresAt: undefined,
    status: "draft",
  });

  const [newItem, setNewItem] = useState<EditedItem>({
    name: "",
    type: "service",
    quantity: 1,
    unitPrice: "0.00",
    discountPercent: 0,
  });

  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  const quoteQuery = trpc.quotes.get.useQuery({ id: quoteId });
  const updateMutation = trpc.quotes.update.useMutation();
  const deleteItemMutation = trpc.quotes.deleteItem.useMutation();
  const createItemMutation = trpc.quotes.createItem.useMutation();
  const emailMutation = trpc.quotes.emailQuote.useMutation();

  const quote = quoteQuery.data as any;

  // Initialize edited quote when data loads
  const handleDownloadPdf = async () => {
    if (!quote) {
      toast.error("Quote not loaded");
      return;
    }

    try {
      const response = await fetch(`/api/trpc/quotes.downloadPdf?input=${encodeURIComponent(JSON.stringify({ id: quote.id }))}`);
      
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quote-${quote.quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("Failed to download PDF:", err);
      toast.error("Failed to download PDF");
    }
  };

  const handleEmailQuote = async () => {
    if (!quote) {
      toast.error("Quote not loaded");
      return;
    }

    setIsEmailLoading(true);
    try {
      await emailMutation.mutateAsync({ id: quote.id });
      toast.success("Quote email sent successfully");
    } catch (err) {
      console.error("Failed to email quote:", err);
      toast.error("Failed to send quote email");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleEditMode = () => {
    if (quote) {
      setEditedQuote({
        description: quote.description || "",
        discount: quote.discount || "0.00",
        discountPercent: quote.discountPercent || 0,
        expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : undefined,
        status: quote.status,
      });
      setIsEditing(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!quote) return;

    try {
      await updateMutation.mutateAsync({
        id: quote.id,
        description: editedQuote.description,
        discount: editedQuote.discount,
        discountPercent: editedQuote.discountPercent,
        expiresAt: editedQuote.expiresAt,
      });

      toast.success("Quote updated successfully");
      setIsEditing(false);
      quoteQuery.refetch();
    } catch (err) {
      console.error("Failed to update quote:", err);
      toast.error("Failed to update quote");
    }
  };

  const handleAddItem = async () => {
    if (!quote || !newItem.name || !newItem.unitPrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createItemMutation.mutateAsync({
        quoteId: quote.id,
        name: newItem.name,
        type: newItem.type,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        discountPercent: newItem.discountPercent,
      });

      toast.success("Item added successfully");
      setNewItem({
        name: "",
        type: "service",
        quantity: 1,
        unitPrice: "0.00",
        discountPercent: 0,
      });
      setShowAddItem(false);
      quoteQuery.refetch();
    } catch (err) {
      console.error("Failed to add item:", err);
      toast.error("Failed to add item");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItemMutation.mutateAsync({ id: itemId });
      toast.success("Item deleted successfully");
      quoteQuery.refetch();
      setDeleteItemId(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      toast.error("Failed to delete item");
    }
  };

  const items: any[] = quote?.items || [];

  const totals = useMemo(() => {
    let subtotal = 0;
    for (const item of items) {
      const price = parseFloat(item.unitPrice);
      const itemSubtotal = item.quantity * price;
      const itemDiscount = itemSubtotal * (item.discountPercent / 100);
      subtotal += itemSubtotal - itemDiscount;
    }

    const quoteDiscountAmount = parseFloat(editedQuote.discount || "0.00");
    const quotePercentDiscount = subtotal * (editedQuote.discountPercent / 100);
    const total = subtotal - quoteDiscountAmount - quotePercentDiscount;
    const vat = total * 0.15;
    const grandTotal = total + vat;

    return {
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      vat: vat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    };
  }, [items, editedQuote.discount, editedQuote.discountPercent]);

  if (quoteQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Quote not found</p>
        <Button onClick={() => navigate("/admin/quotes")}>Back to Quotes</Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <button
          onClick={() => navigate("/admin/quotes")}
          className="hover:text-foreground transition-colors"
        >
          Quotes
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{quote?.quoteNumber || `Quote #${quoteId}`}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/quotes")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{quote.quoteNumber}</h1>
            <p className="text-muted-foreground mt-1">
              {quote.client
                ? `${quote.client.firstName} ${quote.client.lastName}`
                : "Unknown Client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button onClick={handleEmailQuote} variant="outline" className="gap-2" disabled={isEmailLoading}>
                {isEmailLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email Quote
              </Button>
              <Button onClick={handleEditMode} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Quote
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status & Dates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Status</p>
            {isEditing ? (
              <Select value={editedQuote.status} onValueChange={(value) =>
                setEditedQuote({ ...editedQuote, status: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {isExpired ? "Expired" : statusConfig.label}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Created</p>
            <p className="font-semibold">
              {new Date(quote.createdAt).toLocaleDateString("en-ZA")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Expires</p>
            {isEditing ? (
              <Input
                type="date"
                value={
                  editedQuote.expiresAt
                    ? editedQuote.expiresAt.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setEditedQuote({
                    ...editedQuote,
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
              />
            ) : (
              <p className="font-semibold">
                {quote.expiresAt
                  ? new Date(quote.expiresAt).toLocaleDateString("en-ZA")
                  : "Never"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedQuote.description || ""}
              onChange={(e) =>
                setEditedQuote({ ...editedQuote, description: e.target.value })
              }
              placeholder="Add quote description or notes..."
              className="min-h-24"
            />
          ) : (
            <p className="text-muted-foreground">
              {quote.description || "No description"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          {isEditing && (
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Quote Item</DialogTitle>
                  <DialogDescription>
                    Add a new item to this quote
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-1 block">
                      Item Name *
                    </label>
                    <Input
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, name: e.target.value })
                      }
                      placeholder="e.g., Labour, Gate Motor, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-1 block">
                        Type
                      </label>
                      <Select
                        value={newItem.type}
                        onValueChange={(value: any) =>
                          setNewItem({ ...newItem, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="part">Part</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="labour">Labour</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            quantity: parseFloat(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-1 block">
                        Unit Price (R) *
                      </label>
                      <Input
                        value={newItem.unitPrice}
                        onChange={(e) =>
                          setNewItem({ ...newItem, unitPrice: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">
                        Discount %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newItem.discountPercent}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            discountPercent: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddItem(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddItem}
                      disabled={createItemMutation.isPending}
                    >
                      {createItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No items in this quote
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price (R)</TableHead>
                    <TableHead>Discount %</TableHead>
                    <TableHead className="text-right">Line Total (R)</TableHead>
                    {isEditing && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => {
                    const price = parseFloat(item.unitPrice);
                    const itemSubtotal = item.quantity * price;
                    const itemDiscount = itemSubtotal * (item.discountPercent / 100);
                    const lineTotal = itemSubtotal - itemDiscount;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="capitalize">{item.type}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R {price.toFixed(2)}</TableCell>
                        <TableCell>{item.discountPercent}%</TableCell>
                        <TableCell className="text-right font-semibold">
                          R {lineTotal.toFixed(2)}
                        </TableCell>
                        {isEditing && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteItemId(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discounts & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Discounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Fixed Discount (R)
              </label>
              {isEditing ? (
                <Input
                  value={editedQuote.discount}
                  onChange={(e) =>
                    setEditedQuote({ ...editedQuote, discount: e.target.value })
                  }
                  placeholder="0.00"
                />
              ) : (
                <p className="font-semibold">R {parseFloat(quote.discount || "0").toFixed(2)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Percentage Discount (%)
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editedQuote.discountPercent}
                  onChange={(e) =>
                    setEditedQuote({
                      ...editedQuote,
                      discountPercent: parseInt(e.target.value) || 0,
                    })
                  }
                />
              ) : (
                <p className="font-semibold">{quote.discountPercent}%</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">R {totals.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">After Discount:</span>
              <span className="font-semibold">R {totals.total}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">VAT (15%):</span>
              <span className="font-semibold">R {totals.vat}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg">
              <span className="font-bold">Grand Total:</span>
              <span className="font-bold text-lime-600">R {totals.grandTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={updateMutation.isPending}
            className="gap-2 bg-lime-600 hover:bg-lime-700"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Delete Item Confirmation */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from the quote?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && handleDeleteItem(deleteItemId)}
              disabled={deleteItemMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
