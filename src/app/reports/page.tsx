
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { DateRange } from "react-day-picker";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2, FileText } from 'lucide-react';
import type { Order, Customer } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportsPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(1)),
    to: new Date(),
  });

  useEffect(() => {
    setLoading(true);

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
      setOrders(ordersData);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast({ title: 'Error', description: 'Failed to fetch orders.', variant: 'destructive'});
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
      toast({ title: 'Error', description: 'Failed to fetch customers.', variant: 'destructive'});
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, [toast]);

  const filteredOrders = useMemo(() => {
    if (!date?.from) return [];
    
    const fromDate = date.from;
    const toDate = date.to ? date.to : fromDate;
    
    const endOfDayToDate = new Date(toDate);
    endOfDayToDate.setHours(23, 59, 59, 999);

    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= fromDate && orderDate <= endOfDayToDate;
    }).sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  }, [date, orders]);

  const reportStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((acc, order) => {
      if (order.status === 'Completed' || order.status === 'Delivered') {
        return acc + order.totalValue;
      }
      if (order.status === 'Advance Taken') {
        return acc + (order.advanceAmount || 0);
      }
      return acc;
    }, 0);

    const outstandingBalance = filteredOrders.reduce((acc, order) => {
        if (order.status === 'COD') {
            return acc + order.totalValue;
        }
        if (order.status === 'Advance Taken') {
            return acc + (order.totalValue - (order.advanceAmount || 0));
        }
        return acc;
    }, 0);

    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      outstandingBalance,
      codOrders: filteredOrders.filter(o => o.status === 'COD').length,
      advanceTakenOrders: filteredOrders.filter(o => o.status === 'Advance Taken').length,
      completedOrders: filteredOrders.filter(o => o.status === 'Completed').length,
      deliveredOrders: filteredOrders.filter(o => o.status === 'Delivered').length,
    }
  }, [filteredOrders]);


  const handleGenerateReport = () => {
    if (!date?.from || filteredOrders.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no data to generate a report for the selected date range.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales & Order Report', pageWidth / 2, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const dateRange = `From: ${format(date.from, 'PP')} To: ${format(date.to || date.from, 'PP')}`;
      doc.text(dateRange, pageWidth / 2, 30, { align: 'center' });

      // Summary Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 50);

      (doc as any).autoTable({
        startY: 55,
        body: [
            [{ content: 'Total Orders', styles: { fontStyle: 'bold' } }, reportStats.totalOrders],
            [{ content: 'Total Revenue', styles: { fontStyle: 'bold' } }, `LKR ${reportStats.totalRevenue.toFixed(2)}`],
            [{ content: 'Outstanding Balance', styles: { fontStyle: 'bold' } }, `LKR ${reportStats.outstandingBalance.toFixed(2)}`],
            [{ content: 'COD Orders', styles: { fontStyle: 'bold' } }, reportStats.codOrders],
            [{ content: 'Advance Taken Orders', styles: { fontStyle: 'bold' } }, reportStats.advanceTakenOrders],
            [{ content: 'Completed Orders', styles: { fontStyle: 'bold' } }, reportStats.completedOrders],
            [{ content: 'Delivered Orders', styles: { fontStyle: 'bold' } }, reportStats.deliveredOrders],
        ],
        theme: 'striped',
        styles: { cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 50 } },
      });

      let finalY = (doc as any).lastAutoTable.finalY || 100;
      
      // Detailed Orders Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Order List', 14, finalY + 15);
      
      const tableColumn = ["ID", "Customer", "Delivery Date", "Status", "Value (LKR)"];
      const tableRows: (string | number)[][] = [];

      filteredOrders.forEach(order => {
          const orderData = [
              order.orderId,
              customers[order.customerId]?.fullName || 'N/A',
              format(new Date(order.deliveryDate), 'PP'),
              order.status,
              order.totalValue.toFixed(2)
          ];
          tableRows.push(orderData);
      });

      (doc as any).autoTable({
        startY: finalY + 20,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [105, 87, 227] }, // primary color
      });

      finalY = (doc as any).lastAutoTable.finalY;

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.text(`Report generated on ${format(new Date(), 'PPp')}`, 14, pageHeight - 10);
      doc.text('Bloomora Order Management', pageWidth - 14, pageHeight - 10, { align: 'right' });


      doc.save(`Bloomora_Report_${format(date.from, 'yyyy-MM-dd')}_to_${format(date.to || date.from, 'yyyy-MM-dd')}.pdf`);

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({ title: 'Error', description: 'Failed to generate PDF report.', variant: 'destructive'});
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <div className="flex w-full sm:w-auto items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
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
             <Button
                onClick={handleGenerateReport}
                disabled={loading || isGenerating || filteredOrders.length === 0}
                className="w-full sm:w-auto"
                >
                {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                Generate Report
            </Button>
        </div>
      </div>

       {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        ) : (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Report Preview</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Summary for the selected period. Click "Generate Report" to download the full PDF.
                    </p>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
                        <p className="text-2xl font-bold">{reportStats.totalOrders}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                        <p className="text-2xl font-bold">LKR {reportStats.totalRevenue.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Outstanding Balance</h3>
                        <p className="text-2xl font-bold">LKR {reportStats.outstandingBalance.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">COD Orders</h3>
                        <p className="text-2xl font-bold">{reportStats.codOrders}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Advance Taken Orders</h3>
                        <p className="text-2xl font-bold">{reportStats.advanceTakenOrders}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Completed Orders</h3>
                        <p className="text-2xl font-bold">{reportStats.completedOrders}</p>
                    </Card>
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Delivered Orders</h3>
                        <p className="text-2xl font-bold">{reportStats.deliveredOrders}</p>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Filtered Orders ({filteredOrders.length})</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[50vh] overflow-y-auto">
                    {filteredOrders.length > 0 ? (
                    <div className="space-y-2">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                <div>
                                    <p className="font-semibold">{order.orderId} - <span className="font-normal">{customers[order.customerId]?.fullName || 'Unknown'}</span></p>
                                    <p className="text-sm text-muted-foreground">Delivery: {format(new Date(order.deliveryDate), 'PP')}</p>
                                </div>
                                <div className="text-right">
                                     <p className="font-semibold">LKR {order.totalValue.toFixed(2)}</p>
                                     <p className="text-sm text-muted-foreground">{order.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4" />
                        <p>No orders found for the selected date range.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
        )}
    </div>
  );
}
