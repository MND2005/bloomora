'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Order } from '@/lib/types';
import { initialOrders, customers } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { OrderForm } from '@/components/order-form';
import { format } from 'date-fns';

export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const customerMap = customers.reduce((acc, customer) => {
    acc[customer.id] = customer.fullName;
    return acc;
  }, {} as Record<string, string>);

  const handleFormSubmit = (order: Order) => {
    if (editingOrder) {
      // Edit
      setOrders(orders.map((o) => (o.id === order.id ? order : o)));
      toast({ title: 'Order Updated', description: `Order ${order.orderId} has been updated.` });
    } else {
      // Add
      const newOrder = {
        ...order,
        id: `o${orders.length + 1}`,
        orderId: `PT-${1001 + orders.length}`,
        orderDate: new Date().toISOString(),
      };
      setOrders([...orders, newOrder]);
      toast({ title: 'Order Added', description: `Order ${newOrder.orderId} has been added.` });
    }
    handleCloseForm();
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!orderToDelete) return;
    setOrders(orders.filter((o) => o.id !== orderToDelete.id));
    toast({ title: 'Order Deleted', description: `Order ${orderToDelete.orderId} has been deleted.`, variant: 'destructive' });
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{customerMap[order.customerId]}</TableCell>
                <TableCell>{format(new Date(order.deliveryDate), 'PP')}</TableCell>
                <TableCell>${order.totalValue.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(order)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => openDeleteDialog(order)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
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
