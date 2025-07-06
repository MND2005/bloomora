
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';

const formSchema = z.object({
  customerId: z.string().nonempty({ message: 'A customer must be selected.' }),
  products: z.string().min(3, { message: 'Product details must be at least 3 characters.' }),
  deliveryDate: z.date({ required_error: 'A delivery date is required.' }),
  totalValue: z.coerce.number().positive({ message: 'Total value must be a positive number.' }),
  status: z.enum(['Processing', 'Advance Taken', 'Completed']),
  advanceAmount: z.coerce.number().optional(),
  specialInstructions: z.string().optional(),
}).refine(data => {
    if (data.status === 'Advance Taken') {
        return data.advanceAmount !== undefined && data.advanceAmount > 0;
    }
    return true;
}, {
    message: 'Advance amount is required when status is "Advance Taken".',
    path: ['advanceAmount'],
});

type OrderFormValues = z.infer<typeof formSchema>;

type OrderFormProps = {
  order: Order | null;
  customers: Customer[];
  onSubmit: (data: Omit<Order, 'id' | 'orderId' | 'orderDate'>) => void;
  onCancel: () => void;
};

export function OrderForm({ order, customers, onSubmit, onCancel }: OrderFormProps) {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: order?.customerId || '',
      products: order?.products || '',
      deliveryDate: order ? new Date(order.deliveryDate) : new Date(),
      totalValue: order?.totalValue || 0,
      status: order?.status || 'Processing',
      advanceAmount: order?.advanceAmount || undefined,
      specialInstructions: order?.specialInstructions || '',
    },
  });

  useEffect(() => {
    if (order) {
        form.reset({
            ...order,
            deliveryDate: new Date(order.deliveryDate),
        });
    } else {
        form.reset({
          customerId: '',
          products: '',
          deliveryDate: new Date(),
          totalValue: 0,
          status: 'Processing',
          advanceAmount: undefined,
          specialInstructions: '',
        });
    }
  }, [order, form]);


  const status = form.watch('status');

  const handleSubmit = (values: OrderFormValues) => {
    const orderData = {
        ...values,
        deliveryDate: values.deliveryDate.toISOString(),
        advanceAmount: values.status === 'Advance Taken' ? values.advanceAmount : undefined,
    };
    onSubmit(orderData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="products"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flowers / Products Ordered</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., One dozen red roses, vase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deliveryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Delivery Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Order Value ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="99.99" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Advance Taken">Advance Taken</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {status === 'Advance Taken' && (
          <FormField
            control={form.control}
            name="advanceAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Advance Amount Taken ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="50.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="specialInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Instructions</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Deliver to back door" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {order ? 'Save Changes' : 'Create Order'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
