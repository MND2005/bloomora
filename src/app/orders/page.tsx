
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, Eye, Package } from 'lucide-react';
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


export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);

  const customerMap = customers.reduce((acc, customer) => {
    acc[customer.id] = customer.fullName;
    return acc;
  }, {} as Record<string, string>);

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

  const handleFormSubmit = async (orderData: Omit<Order, 'id' | 'orderId' | 'orderDate'>) => {
    try {
      if (editingOrder) {
        const orderDoc = doc(db, 'orders', editingOrder.id);
        const { id, orderId, orderDate, ...updateData } = { ...editingOrder, ...orderData };
        await updateDoc(orderDoc, updateData);
        toast({ title: 'Order Updated', description: `Order ${editingOrder.orderId} has been updated.` });
      } else {
        const newOrderData = {
          ...orderData,
          orderId: `PT-${Date.now().toString().slice(-4)}`,
          orderDate: new Date().toISOString(),
        };
        await addDoc(collection(db, 'orders'), newOrderData);
        toast({ title: 'Order Added', description: `Order ${newOrderData.orderId} has been added.` });
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
      case 'Completed':
        return 'default';
      case 'Processing':
        return 'secondary';
      case 'Advance Taken':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <Button onClick={() => { setEditingOrder(null); setIsFormOpen(true); }} disabled={customers.length === 0}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>
      {customers.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-4">
            Please add a customer first before creating an order.
        </p>
      )}

      <div className="space-y-4">
          {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
          ) : orders.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">No orders found</h3>
                  <p className="text-sm">Create a new order to get started.</p>
              </div>
          ) : (
              orders.map((order) => (
                <Card key={order.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-muted/20">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-full bg-accent">
                            <Package className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="grid gap-0.5 flex-1">
                            <p className="font-semibold">{order.orderId} - <span className="font-normal">{customerMap[order.customerId] || 'Unknown'}</span></p>
                            <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 sm:ml-auto w-full sm:w-auto justify-end">
                        <p className="font-semibold text-lg mr-auto sm:mr-0">${order.totalValue.toFixed(2)}</p>
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
             <div className="grid gap-3 py-4 text-sm overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Order ID</Label>
                  <span>{orderToView.orderId}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Customer</Label>
                  <span>{customerMap[orderToView.customerId] || 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Order Date</Label>
                  <span>{format(new Date(orderToView.orderDate), 'PPp')}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Delivery Date</Label>
                  <span>{format(new Date(orderToView.deliveryDate), 'PPp')}</span>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-start gap-x-4">
                  <Label className="text-right text-muted-foreground mt-1">Products Ordered</Label>
                  <p className="leading-relaxed whitespace-pre-wrap">{orderToView.products}</p>
                </div>
                 <div className="grid grid-cols-[150px_1fr] items-start gap-x-4">
                  <Label className="text-right text-muted-foreground mt-1">Special Instructions</Label>
                  <p className="leading-relaxed whitespace-pre-wrap">{orderToView.specialInstructions || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Total Value</Label>
                  <span className="font-semibold">${orderToView.totalValue.toFixed(2)}</span>
                </div>
                 <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                  <Label className="text-right text-muted-foreground">Status</Label>
                  <Badge variant={getStatusBadgeVariant(orderToView.status)}>{orderToView.status}</Badge>
                </div>
                {orderToView.status === 'Advance Taken' && (
                    <div className="grid grid-cols-[150px_1fr] items-center gap-x-4">
                        <Label className="text-right text-muted-foreground">Advance Paid</Label>
                        <span className="font-semibold">${orderToView.advanceAmount?.toFixed(2) ?? '0.00'}</span>
                    </div>
                )}
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
