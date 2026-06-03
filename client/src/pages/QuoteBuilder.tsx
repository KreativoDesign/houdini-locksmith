import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CreateClientDialog } from "@/components/CreateClientDialog";

interface QuoteItem {
  id?: number;
  name: string;
  type: "part" | "service" | "labour" | "other";
  quantity: number;
  unitPrice: string;
  discountPercent: number;
  lineTotal: string;
}

export default function QuoteBuilder() {
  const [, navigate] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState("0.00");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [expiryDays, setExpiryDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<QuoteItem>>({
    type: "service",
    quantity: 1,
    unitPrice: "0.00",
    discountPercent: 0,
  });
  const [showCreateClient, setShowCreateClient] = useState(false);

  const { data: clients, refetch: refetchClients } = trpc.clients.list.useQuery({});
  const createQuoteMutation = trpc.quotes.create.useMutation();
  const sendQuoteMutation = trpc.quotes.send.useMutation();
  const utils = trpc.useUtils();

  // Calculate line totals and quote totals
  const totals = useMemo(() => {
    let subtotal = 0;
    for (const item of items) {
      const price = parseFloat(item.unitPrice || "0");
      const itemSubtotal = item.quantity * price;
      const itemDiscount = itemSubtotal * (item.discountPercent / 100);
      subtotal += itemSubtotal - itemDiscount;
    }

    const quoteDiscountAmount = parseFloat(discount || "0");
    const quotePercentDiscount = subtotal * (discountPercent / 100);
    const total = subtotal - quoteDiscountAmount - quotePercentDiscount;

    const vat = total * 0.15;
    const grandTotal = total + vat;

    return {
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      vat: vat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    };
  }, [items, discount, discountPercent]);

  const handleClientCreated = (newClientId: number) => {
    setClientId(newClientId);
    refetchClients();
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.unitPrice) {
      toast.error("Please fill in all item fields");
      return;
    }

    const price = parseFloat(newItem.unitPrice);
    const itemSubtotal = (newItem.quantity || 1) * price;
    const itemDiscount = itemSubtotal * ((newItem.discountPercent || 0) / 100);
    const lineTotal = (itemSubtotal - itemDiscount).toFixed(2);

    setItems([
      ...items,
      {
        name: newItem.name,
        type: newItem.type || "service",
        quantity: newItem.quantity || 1,
        unitPrice: newItem.unitPrice,
        discountPercent: newItem.discountPercent || 0,
        lineTotal,
      },
    ]);

    setNewItem({ type: "service", quantity: 1, unitPrice: "0.00", discountPercent: 0 });
    setNewItemOpen(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateQuote = async () => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setIsCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const quote = await createQuoteMutation.mutateAsync({
        clientId,
        description,
        items: items.map((item) => ({
          name: item.name,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
        })),
        discount,
        discountPercent,
        expiresAt,
      });

      toast.success(`Quote ${quote.quoteNumber} created`);

      // Send email immediately
      setIsSending(true);
      try {
        await sendQuoteMutation.mutateAsync({ id: quote.id });
        toast.success("Quote sent to client");
      } catch (err) {
        console.error("Failed to send quote:", err);
        toast.error("Quote created but email failed to send");
      } finally {
        setIsSending(false);
      }

      // Reset form
      setClientId(null);
      setDescription("");
      setItems([]);
      setDiscount("0.00");
      setDiscountPercent(0);
      setExpiryDays(7);

      // Navigate to quotes list
      navigate("/admin/quotes");
    } catch (err) {
      console.error("Failed to create quote:", err);
      toast.error("Failed to create quote");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedClient = clients?.rows?.find((c: any) => c.id === clientId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Quote</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="client">Select Client</Label>
                <Select value={clientId?.toString() || ""} onValueChange={(val) => setClientId(parseInt(val))}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.rows?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.firstName} {client.lastName} ({client.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateClient(true)}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Client
              </Button>
              {selectedClient && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
                  <p className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</p>
                  <p className="text-slate-600">{selectedClient.email}</p>
                  <p className="text-slate-600">{selectedClient.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Brief description of the work or service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Quote Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="item-name">Item Name</Label>
                      <Input
                        id="item-name"
                        placeholder="e.g. Lock Replacement"
                        value={newItem.name || ""}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-type">Type</Label>
                      <Select value={newItem.type || "service"} onValueChange={(val) => setNewItem({ ...newItem, type: val as any })}>
                        <SelectTrigger id="item-type">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item-qty">Quantity</Label>
                        <Input
                          id="item-qty"
                          type="number"
                          min="1"
                          value={newItem.quantity || 1}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-price">Unit Price (R)</Label>
                        <Input
                          id="item-price"
                          placeholder="0.00"
                          value={newItem.unitPrice || ""}
                          onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="item-discount">Discount %</Label>
                      <Input
                        id="item-discount"
                        type="number"
                        min="0"
                        max="100"
                        value={newItem.discountPercent || 0}
                        onChange={(e) => setNewItem({ ...newItem, discountPercent: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={handleAddItem} className="w-full">
                      Add Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-slate-500 text-sm">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-slate-600">
                          {item.quantity} × R {parseFloat(item.unitPrice).toFixed(2)} = R {item.lineTotal}
                        </p>
                        {item.discountPercent > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {item.discountPercent}% discount
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discounts */}
          <Card>
            <CardHeader>
              <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discount-amount">Fixed Discount (R)</Label>
                <Input
                  id="discount-amount"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="discount-percent">Percentage Discount (%)</Label>
                <Input
                  id="discount-percent"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expiry */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Expiry</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="expiry">Expires In (days)</Label>
              <Select value={expiryDays.toString()} onValueChange={(val) => setExpiryDays(parseInt(val))}>
                <SelectTrigger id="expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="999">Never</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 border-b pb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">R {totals.subtotal}</span>
                </div>
                {(parseFloat(discount) > 0 || discountPercent > 0) && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span>
                      -R{" "}
                      {(
                        parseFloat(totals.subtotal) -
                        parseFloat(totals.total)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Total (excl. VAT):</span>
                  <span className="font-semibold">R {totals.total}</span>
                </div>
              </div>

              <div className="space-y-2 border-b pb-4">
                <div className="flex justify-between text-sm">
                  <span>VAT (15%):</span>
                  <span className="font-semibold">R {totals.vat}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold bg-lime-50 p-3 rounded-lg">
                <span>Grand Total:</span>
                <span className="text-lime-700">R {totals.grandTotal}</span>
              </div>

              <Button
                onClick={handleCreateQuote}
                disabled={isCreating || isSending || !clientId || items.length === 0}
                className="w-full gap-2 bg-lime-600 hover:bg-lime-700"
              >
                <Send className="w-4 h-4" />
                {isCreating || isSending ? "Creating..." : "Create & Send Quote"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onClientCreated={handleClientCreated}
      />
    </div>
  );
}
