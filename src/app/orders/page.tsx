
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, Eye, Package, Search, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { Order, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OrderForm } from '@/components/order-form';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sendTelegramNotification, formatNewOrderMessage, formatUpdatedOrderMessage } from '@/services/telegram-service';


export default function OrdersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.id] = customer.fullName;
      return acc;
    }, {} as Record<string, string>);
  }, [customers]);

  useEffect(() => {
    setLoading(true);

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      // Sort orders by most recent first
      ordersData.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(ordersData);
      if (customers.length > 0) setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast({ title: 'Error', description: 'Failed to fetch orders.', variant: 'destructive'});
    });
    
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      toast({ title: 'Error', description: 'Failed to fetch customers.', variant: 'destructive'});
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, [toast, customers.length]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) {
        return orders;
    }
    return orders.filter(order => {
        const customerName = customerMap[order.customerId] || '';
        return (
            order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });
  }, [orders, searchTerm, customerMap]);

  const handleFormSubmit = async (orderData: Omit<Order, 'id' | 'orderId' | 'orderDate'>) => {
    try {
      if (editingOrder) {
        const orderDoc = doc(db, 'orders', editingOrder.id);
        const { id, orderId, orderDate, ...updateData } = { ...editingOrder, ...orderData };
        const finalUpdateData = {
          ...updateData,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'System',
        }
        await updateDoc(orderDoc, finalUpdateData);
        toast({ title: 'Order Updated', description: `Order ${editingOrder.orderId} has been updated.` });
        
        // Send Telegram notification for update
        const customerName = customerMap[finalUpdateData.customerId] || 'Unknown Customer';
        const message = formatUpdatedOrderMessage({ ...finalUpdateData, orderId: editingOrder.orderId }, customerName);
        sendTelegramNotification(message);

      } else {
        const newOrderData = {
          ...orderData,
          orderId: `BL-${Date.now().toString().slice(-4)}`,
          orderDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: user?.email || 'System',
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'System',
        };
        await addDoc(collection(db, 'orders'), newOrderData);
        toast({ title: 'Order Added', description: `Order ${newOrderData.orderId} has been added.` });

        // Send Telegram notification for new order
        const customerName = customerMap[newOrderData.customerId] || 'Unknown Customer';
        const message = formatNewOrderMessage(newOrderData, customerName);
        sendTelegramNotification(message);
      }
      handleCloseForm();
    } catch(e) {
        console.error("Error saving order:", e);
        toast({ title: 'Error', description: 'Failed to save order.', variant: 'destructive'});
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleViewDetails = (order: Order) => {
    setOrderToView(order);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
        await deleteDoc(doc(db, 'orders', orderToDelete.id));
        toast({ title: 'Order Deleted', description: `Order ${orderToDelete.orderId} has been deleted.`, variant: 'destructive' });
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
    } catch(e) {
        console.error("Error deleting order:", e);
        toast({ title: 'Error', description: 'Failed to delete order.', variant: 'destructive'});
    }
  };
  
  const openDeleteDialog = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  }
  
  const handleCloseForm = () => {
    setEditingOrder(null);
    setIsFormOpen(false);
  };
  
  const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'Delivered':
        return 'default';
      case 'Completed':
        return 'outline';
      case 'COD':
      case 'Advance Taken':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  const activeOrders = filteredOrders.filter(o => o.status !== 'Delivered');
  const deliveredOrders = filteredOrders.filter(o => o.status === 'Delivered');

  const handleDownloadInvoice = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) {
        toast({ title: 'Error', description: 'Customer not found for this order.', variant: 'destructive'});
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('Bloomora', 14, 22);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 14, 22, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(14, 40, pageWidth - 14, 40);

    doc.setFontSize(10);
    doc.text('BILL TO', 14, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.fullName, 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.address.replace(/\n/g, ', '), 14, 60);
    doc.text(customer.phone, 14, 65);
    
    const rightColX = pageWidth - 14;
    const rightColLabelsX = pageWidth - 60;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID:', rightColLabelsX, 50, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(order.orderId, rightColX, 50, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', rightColLabelsX, 55, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(order.orderDate), 'PP'), rightColX, 55, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Date:', rightColLabelsX, 60, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(order.deliveryDate), 'PP'), rightColX, 60, { align: 'right' });

    const productLines = order.products.split('\n').map(line => [line]);

    (doc as any).autoTable({
        startY: 80,
        head: [['Products Ordered']],
        body: productLines,
        theme: 'striped',
        headStyles: { fillColor: [105, 87, 227] }, // primary color
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;
    
    const drawTotals = (y: number) => {
        let currentY = y + 10;
        const totalsLabelX = 165;

        doc.setFontSize(12);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Total:', totalsLabelX, currentY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`LKR ${order.totalValue.toFixed(2)}`, rightColX, currentY, { align: 'right' });

        if (order.status === 'Advance Taken' && order.advanceAmount) {
            currentY += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Paid:', totalsLabelX, currentY, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text(`LKR ${order.advanceAmount.toFixed(2)}`, rightColX, currentY, { align: 'right' });
        } else if (order.status === 'Completed' || order.status === 'Delivered') {
            currentY += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Paid:', totalsLabelX, currentY, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text(`LKR ${order.totalValue.toFixed(2)}`, rightColX, currentY, { align: 'right' });
        }

        doc.setLineWidth(0.2);
        doc.line(135, currentY + 3, rightColX, currentY + 3);
        currentY += 7;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Due:', totalsLabelX, currentY, { align: 'right' });
        let balanceDue = 0;
        if (order.status === 'COD') {
            balanceDue = order.totalValue;
        } else if (order.status === 'Advance Taken' && order.advanceAmount) {
            balanceDue = order.totalValue - order.advanceAmount;
        }
        doc.text(`LKR ${balanceDue.toFixed(2)}`, rightColX, currentY, { align: 'right' });
        
        return currentY;
    };
    
    finalY = drawTotals(finalY);

    const notesY = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', 14, notesY + 5);

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.text('Bloomora | +94 77 962 8295 (WhatsApp)', pageWidth/2, pageHeight-10, { align: 'center'});

    doc.save(`Invoice-${order.orderId}.pdf`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by Order ID or Customer..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={() => { setEditingOrder(null); setIsFormOpen(true); }} disabled={customers.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Order
            </Button>
        </div>
      </div>
      {customers.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
            Please add a customer first before creating an order.
        </p>
      )}

      <div className="space-y-6">
          {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
          ) : filteredOrders.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">{searchTerm ? 'No orders found' : 'No orders yet'}</h3>
                  <p className="text-sm">{searchTerm ? `Your search for "${searchTerm}" did not match any orders.` : 'Create a new order to get started.'}</p>
              </div>
          ) : (
            <>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold tracking-tight">Active Orders</h3>
                    {activeOrders.length > 0 ? (
                        activeOrders.map((order) => (
                          <Card key={order.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-accent">
                              <div className="flex items-center gap-4 flex-1">
                                  <div className="p-3 rounded-full bg-secondary shadow-neumorphic-inset">
                                      <Package className="w-5 h-5 text-accent-foreground" />
                                  </div>
                                  <div className="grid gap-0.5 flex-1">
                                      <p className="font-semibold">{order.orderId} - <span className="font-normal">{customerMap[order.customerId] || 'Unknown'}</span></p>
                                      <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 sm:ml-auto w-full sm:w-auto justify-end">
                                  <p className="font-semibold text-lg mr-auto sm:mr-0">LKR {order.totalValue.toFixed(2)}</p>
                                   <Badge variant={getStatusBadgeVariant(order.status)} className="h-6">
                                      {order.status}
                                  </Badge>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">Open menu</span>
                                          <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                                          <Download className="mr-2 h-4 w-4" /> Download Invoice
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleEdit(order)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openDeleteDialog(order)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                          </Card>
                        ))
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                           <Package className="mx-auto h-12 w-12 mb-4" />
                          <h3 className="text-lg font-semibold">{searchTerm ? 'No active orders found' : 'No active orders'}</h3>
                          <p className="text-sm">{searchTerm ? 'Try a different search term.' : 'New orders will appear here.'}</p>
                      </div>
                    )}
                </div>

                {deliveredOrders.length > 0 && (
                   <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="delivered-orders">
                            <AccordionTrigger className="text-xl font-semibold tracking-tight hover:no-underline">
                                Delivered Orders ({deliveredOrders.length})
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-4 border-t">
                                    {deliveredOrders.map((order) => (
                                         <Card key={order.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-accent">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-3 rounded-full bg-secondary shadow-neumorphic-inset">
                                                    <Package className="w-5 h-5 text-accent-foreground" />
                                                </div>
                                                <div className="grid gap-0.5 flex-1">
                                                    <p className="font-semibold">{order.orderId} - <span className="font-normal">{customerMap[order.customerId] || 'Unknown'}</span></p>
                                                    <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 sm:ml-auto w-full sm:w-auto justify-end">
                                                <p className="font-semibold text-lg mr-auto sm:mr-0">LKR {order.totalValue.toFixed(2)}</p>
                                                 <Badge variant={getStatusBadgeVariant(order.status)} className="h-6">
                                                    {order.status}
                                                </Badge>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                                          <Eye className="mr-2 h-4 w-4" /> View
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => handleDownloadInvoice(order)}>
                                                        <Download className="mr-2 h-4 w-4" /> Download Invoice
                                                      </DropdownMenuItem>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem onClick={() => handleEdit(order)} disabled>
                                                          <Pencil className="mr-2 h-4 w-4" /> Edit
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => openDeleteDialog(order)} className="text-destructive focus:text-destructive">
                                                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </>
          )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Edit Order' : 'Create New Order'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? "Update the order's details." : 'Enter the new order details.'}
            </DialogDescription>
          </DialogHeader>
          <OrderForm
            order={editingOrder}
            customers={customers}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
      
       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Viewing full information for Order ID: {orderToView?.orderId}
            </DialogDescription>
          </DialogHeader>
          {orderToView && (
             <div className="space-y-4 py-4 text-sm">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Order ID</Label>
                  <span className="break-words">{orderToView.orderId}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Customer</Label>
                  <span className="break-words">{customerMap[orderToView.customerId] || 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Order Date</Label>
                  <span className="break-words">{format(new Date(orderToView.orderDate), 'PPp')}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Delivery Date</Label>
                  <span className="break-words">{format(new Date(orderToView.deliveryDate), 'PPp')}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-start sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right sm:mt-1">Products Ordered</Label>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{orderToView.products}</p>
                </div>
                 <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-start sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right sm:mt-1">Special Instructions</Label>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{orderToView.specialInstructions || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Total Value</Label>
                  <span className="font-semibold break-words">LKR {orderToView.totalValue.toFixed(2)}</span>
                </div>
                 <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Status</Label>
                  <Badge variant={getStatusBadgeVariant(orderToView.status)}>{orderToView.status}</Badge>
                </div>
                {orderToView.status === 'Advance Taken' && (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                        <Label className="text-muted-foreground sm:text-right">Advance Paid</Label>
                        <span className="font-semibold break-words">LKR {orderToView.advanceAmount?.toFixed(2) ?? '0.00'}</span>
                    </div>
                )}

                <Separator className="my-2" />
                <h4 className="font-semibold text-sm text-foreground">Action Centre</h4>

                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Last Updated</Label>
                  <span className="break-words">{orderToView.updatedAt ? format(new Date(orderToView.updatedAt), 'PPp') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Updated By</Label>
                  <span className="break-words">{orderToView.updatedBy || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Created</Label>
                  <span className="break-words">{orderToView.createdAt ? format(new Date(orderToView.createdAt), 'PPp') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-x-4">
                  <Label className="text-muted-foreground sm:text-right">Created By</Label>
                  <span className="break-words">{orderToView.createdBy || 'N/A'}</span>
                </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete order "{orderToDelete?.orderId}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
