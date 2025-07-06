
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
  DollarSign,
  Package,
  Clock,
  PackageCheck,
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Order, Customer } from '@/lib/types';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
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
    processing: orders.filter((o) => o.status === 'Processing').length,
    advanceTaken: orders.filter((o) => o.status === 'Advance Taken').length,
    completed: orders.filter((o) => o.status === 'Completed').length,
    totalPayments: orders.reduce((acc, order) => {
      if (order.status === 'Completed') return acc + order.totalValue;
      if (order.status === 'Advance Taken' && order.advanceAmount)
        return acc + order.advanceAmount;
      return acc;
    }, 0),
    outstandingBalance: orders.reduce((acc, order) => {
      if (order.status === 'Processing') return acc + order.totalValue;
      if (order.status === 'Advance Taken' && order.advanceAmount)
        return acc + (order.totalValue - order.advanceAmount);
      return acc;
    }, 0),
  };

  const upcomingDeliveries = orders
    .filter((o) => o.status !== 'Completed' && new Date(o.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
    .slice(0, 5);
    
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
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">Orders currently in preparation.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advance Taken</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.advanceTaken}</div>
            <p className="text-xs text-muted-foreground">Orders with partial payment.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Orders successfully delivered.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalPayments.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total revenue collected.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.outstandingBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Pending payments to be collected.</p>
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
    </div>
  );
}
