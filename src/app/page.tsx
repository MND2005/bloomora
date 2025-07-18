
'use client';

import { useState, useEffect } from 'react';
import type { DateRange } from "react-day-picker";
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
  Archive,
  X,
} from 'lucide-react';
import type { Order, Customer, OrderStatus } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [ordersToShow, setOrdersToShow] = useState<Order[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogContent, setDialogContent] = useState<'default' | 'outstanding' | 'payments'>('default');

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

  useEffect(() => {
    if (!date?.from) {
      setDisplayedOrders(orders);
    } else {
      const fromDate = date.from;
      const toDate = date.to ? date.to : date.from;
      
      const endOfDayToDate = new Date(toDate);
      endOfDayToDate.setHours(23, 59, 59, 999);

      const filtered = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= fromDate && orderDate <= endOfDayToDate;
      });
      setDisplayedOrders(filtered);
    }
  }, [date, orders]);

  const stats = {
    processing: displayedOrders.filter((o) => o.status === 'COD').length,
    advanceTaken: displayedOrders.filter((o) => o.status === 'Advance Taken').length,
    completed: displayedOrders.filter((o) => o.status === 'Completed').length,
    delivered: displayedOrders.filter((o) => o.status === 'Delivered').length,
    totalPayments: displayedOrders.reduce((acc, order) => {
      if (order.status === 'Completed' || order.status === 'Delivered') {
        return acc + order.totalValue;
      }
      if (order.status === 'Advance Taken') {
        return acc + (order.advanceAmount || 0);
      }
      return acc;
    }, 0),
    outstandingBalance: displayedOrders.reduce((acc, order) => {
      if (order.status === 'COD') {
        return acc + order.totalValue;
      }
      if (order.status === 'Advance Taken') {
        return acc + (order.totalValue - (order.advanceAmount || 0));
      }
      return acc;
    }, 0),
  };

  const upcomingDeliveries = displayedOrders
    .filter((o) => o.status !== 'Delivered' && new Date(o.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
    .slice(0, 5);

  const handleStatusCardClick = (status: OrderStatus) => {
    const filteredOrders = displayedOrders.filter(order => order.status === status);
    filteredOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    setOrdersToShow(filteredOrders);
    setDialogTitle(`${status} Orders`);
    setDialogDescription(`Showing all orders with the status "${status}".`);
    setDialogContent('default');
    setIsStatusDialogOpen(true);
  };
  
  const handleFinancialCardClick = (type: 'totalPayments' | 'outstandingBalance') => {
    let filteredOrders: Order[] = [];
    let title = '';
    let description = '';

    if (type === 'totalPayments') {
        filteredOrders = displayedOrders.filter(order => 
            order.status === 'Completed' || 
            order.status === 'Delivered' || 
            order.status === 'Advance Taken'
        );
        title = 'Orders Contributing to Total Payments';
        description = 'These orders have received payments (full or partial).';
        setDialogContent('payments');
    } else if (type === 'outstandingBalance') {
        filteredOrders = displayedOrders.filter(order => 
            order.status === 'COD' || 
            order.status === 'Advance Taken'
        );
        title = 'Orders with Outstanding Balance';
        description = 'These orders have pending payments to be collected.';
        setDialogContent('outstanding');
    }
    
    // Sort to ensure latest order is always first in the popup
    filteredOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    setOrdersToShow(filteredOrders);
    setDialogTitle(title);
    setDialogDescription(description);
    setIsStatusDialogOpen(true);
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

  if (loading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center h-[calc(100vh-8rem)]">
             <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => setDate(undefined)} disabled={!date}>
                <X className="h-4 w-4" />
                <span className="sr-only">Reset</span>
            </Button>
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card onClick={() => handleFinancialCardClick('totalPayments')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
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
         <Card onClick={() => handleFinancialCardClick('outstandingBalance')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
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
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Orders finished and packed.</p>
          </CardContent>
        </Card>
        <Card onClick={() => handleStatusCardClick('Delivered')} className="aspect-square sm:aspect-auto flex flex-col justify-center cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
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
            upcomingDeliveries.map((order) => {
              const deliveryDate = new Date(order.deliveryDate);
              const daysUntil = differenceInDays(deliveryDate, new Date());
              const isUrgent = daysUntil >= 0 && daysUntil < 10;

              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between w-full p-2 rounded-md transition-colors",
                    isUrgent
                      ? "bg-destructive/10 hover:bg-destructive/20"
                      : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-3 rounded-full",
                        isUrgent ? "bg-destructive" : "bg-accent"
                      )}
                    >
                      <CalendarIcon
                        className={cn(
                          "w-5 h-5",
                          isUrgent
                            ? "text-destructive-foreground"
                            : "text-accent-foreground"
                        )}
                      />
                    </div>
                    <div className="grid gap-0.5">
                      <p className="font-medium">
                        {customers[order.customerId]?.fullName ||
                          "Unknown Customer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.orderId} - {format(new Date(order.deliveryDate), "PPP p")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              );
            })
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
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-4">
              {ordersToShow.length > 0 ? (
                dialogContent === 'outstanding' || dialogContent === 'payments' ? (
                   ordersToShow.map((order) => {
                    let amountPaid = 0;
                    if (dialogContent === 'outstanding') {
                        amountPaid = order.advanceAmount || 0;
                    } else { // payments
                        if (order.status === 'Completed' || order.status === 'Delivered') {
                            amountPaid = order.totalValue;
                        } else if (order.status === 'Advance Taken') {
                            amountPaid = order.advanceAmount || 0;
                        }
                    }
                    const toPay = order.totalValue - amountPaid;

                    return (
                        <Card key={order.id} className="p-0 overflow-hidden transition-colors hover:bg-accent">
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={order.id} className="border-b-0">
                              <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 w-full text-left">
                                    <div className="grid gap-0.5">
                                        <p className="font-semibold">{order.orderId} - <span className="font-normal">{customers[order.customerId]?.fullName || 'Unknown'}</span></p>
                                        <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                                    </div>
                                    <Badge variant={getStatusBadgeVariant(order.status)} className="self-start sm:self-center">{order.status}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="border-t border-border px-4 pb-4 pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
                                        <div>
                                            <p className="text-muted-foreground mb-1 uppercase text-xs tracking-wider">Total Value</p>
                                            <p className="font-bold text-base">LKR {order.totalValue.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1 uppercase text-xs tracking-wider">Paid</p>
                                            <p className="font-bold text-base text-chart-2">LKR {amountPaid.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1 uppercase text-xs tracking-wider">{dialogContent === 'outstanding' ? 'To Pay' : 'Remaining Due'}</p>
                                            <p className="font-bold text-base text-destructive">LKR {toPay.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </Card>
                    )
                   })
                ) : (
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
                )
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders found for this category.</p>
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
