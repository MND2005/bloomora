
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Clock,
  PackageCheck,
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Order, Customer, OrderStatus } from '@/lib/types';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [ordersToShow, setOrdersToShow] = useState<Order[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  useEffect(() => {
    setLoading(true);

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      ordersData.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      setOrders(ordersData);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { ...doc.data(), id: doc.id } as Customer;
        return acc;
      }, {} as Record<string, Customer>);
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, []);

  const stats = {
    processing: orders.filter((o) => o.status === 'COD').length,
    advanceTaken: orders.filter((o) => o.status === 'Advance Taken').length,
    completed: orders.filter((o) => o.status === 'Completed').length,
    totalPayments: orders.reduce((acc, order) => {
      if (order.status === 'Completed') return acc + order.totalValue;
      if (order.status === 'Advance Taken' && order.advanceAmount)
        return acc + order.advanceAmount;
      return acc;
    }, 0),
    outstandingBalance: orders.reduce((acc, order) => {
      if (order.status === 'COD') return acc + order.totalValue;
      if (order.status === 'Advance Taken' && order.advanceAmount)
        return acc + (order.totalValue - order.advanceAmount);
      return acc;
    }, 0),
  };

  const upcomingDeliveries = orders
    .filter((o) => o.status !== 'Completed' && new Date(o.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
    .slice(0, 5);

  const handleStatusCardClick = (status: OrderStatus) => {
    const filteredOrders = orders.filter(order => order.status === status);
    setOrdersToShow(filteredOrders);
    setDialogTitle(`${status} Orders`);
    setIsStatusDialogOpen(true);
  };
  
  const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'COD':
        return 'secondary';
      case 'Advance Taken':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center h-[calc(100vh-8rem)]">
             <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="aspect-square sm:aspect-auto flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              LKR {stats.totalPayments.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total revenue collected.</p>
          </CardContent>
        </Card>
         <Card className="aspect-square sm:aspect-auto flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              LKR {stats.outstandingBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Pending payments to be collected.</p>
          </CardContent>
        </Card>
        <Card onClick={() => handleStatusCardClick('COD')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COD</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">Cash on Delivery orders.</p>
          </CardContent>
        </Card>
        <Card onClick={() => handleStatusCardClick('Advance Taken')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advance Taken</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.advanceTaken}</div>
            <p className="text-xs text-muted-foreground">Orders with partial payment.</p>
          </CardContent>
        </Card>
        <Card onClick={() => handleStatusCardClick('Completed')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Orders successfully delivered.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Upcoming Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {upcomingDeliveries.length > 0 ? (
            upcomingDeliveries.map((order) => (
                <div key={order.id} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between w-full p-2 rounded-md transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="p-3 rounded-full bg-accent">
                            <CalendarIcon className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="grid gap-0.5">
                            <p className="font-medium">{customers[order.customerId]?.fullName || 'Unknown Customer'}</p>
                            <p className="text-sm text-muted-foreground">{order.orderId} - {format(new Date(order.deliveryDate), 'PPP p')}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="self-start sm:self-center">{order.status}</Badge>
                </div>
            ))
            ) : (
                <div className="text-center text-muted-foreground h-24 flex items-center justify-center">
                    <p>No upcoming deliveries.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Showing all orders with the status "{dialogTitle.replace(' Orders', '')}".
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4">
              {ordersToShow.length > 0 ? (
                ordersToShow.map((order) => (
                  <Card key={order.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-accent">
                      <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 rounded-full bg-secondary shadow-neumorphic-inset">
                              <Package className="w-5 h-5 text-accent-foreground" />
                          </div>
                          <div className="grid gap-0.5 flex-1">
                              <p className="font-semibold">{order.orderId} - <span className="font-normal">{customers[order.customerId]?.fullName || 'Unknown'}</span></p>
                              <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4 sm:ml-auto w-full sm:w-auto justify-end">
                          <p className="font-semibold text-lg mr-auto sm:mr-0">LKR {order.totalValue.toFixed(2)}</p>
                           <Badge variant={getStatusBadgeVariant(order.status)} className="h-6">
                              {order.status}
                          </Badge>
                      </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders found with this status.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
