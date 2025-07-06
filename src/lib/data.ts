import type { Customer, Order } from './types';
import { subDays, addDays } from 'date-fns';

export const customers: Customer[] = [
  {
    id: 'c1',
    fullName: 'Eleanor Vance',
    phone: '555-0101',
    email: 'eleanor.v@example.com',
    address: '123 Rose Lane, Bloomville, FL 12345',
    preferences: 'Loves lilies, allergic to daisies.',
  },
  {
    id: 'c2',
    fullName: 'Marcus Holloway',
    phone: '555-0102',
    email: 'marcus.h@example.com',
    address: '456 Orchid Ave, Petalburg, FL 12346',
    preferences: 'Prefers vibrant colors. No pink.',
  },
  {
    id: 'c3',
    fullName: 'Chloe Price',
    phone: '555-0103',
    email: 'chloe.p@example.com',
    address: '789 Tulip St, Garden City, FL 12347',
    preferences: 'Sunflowers for all occasions.',
  },
  {
    id: 'c4',
    fullName: 'Arthur Morgan',
    phone: '555-0104',
    email: 'arthur.m@example.com',
    address: '101 Wildflower Rd, Meadowview, FL 12348',
    preferences: 'Rustic, natural arrangements.',
  }
];

export const orders: Order[] = [
  {
    id: 'o1',
    orderId: 'PT-1001',
    customerId: 'c1',
    orderDate: subDays(new Date(), 5).toISOString(),
    deliveryDate: subDays(new Date(), 3).toISOString(),
    products: 'One dozen white lilies, baby\'s breath',
    totalValue: 75.0,
    status: 'Completed',
    specialInstructions: 'Deliver after 3 PM.',
  },
  {
    id: 'o2',
    orderId: 'PT-1002',
    customerId: 'c2',
    orderDate: subDays(new Date(), 2).toISOString(),
    deliveryDate: addDays(new Date(), 1).toISOString(),
    products: 'Mixed bouquet of orange and yellow flowers.',
    totalValue: 120.5,
    status: 'Processing',
    specialInstructions: 'Please include a card with "Happy Birthday!".',
  },
  {
    id: 'o3',
    orderId: 'PT-1003',
    customerId: 'c3',
    orderDate: subDays(new Date(), 1).toISOString(),
    deliveryDate: addDays(new Date(), 3).toISOString(),
    products: 'Large sunflower arrangement.',
    totalValue: 95.0,
    status: 'Advance Taken',
    advanceAmount: 50.0,
    specialInstructions: 'Use a clear vase.',
  },
  {
    id: 'o4',
    orderId: 'PT-1004',
    customerId: 'c1',
    orderDate: subDays(new Date(), 10).toISOString(),
    deliveryDate: subDays(new Date(), 8).toISOString(),
    products: 'Small rose bouquet',
    totalValue: 45.0,
    status: 'Completed',
    specialInstructions: 'Thank you gift.',
  },
    {
    id: 'o5',
    orderId: 'PT-1005',
    customerId: 'c4',
    orderDate: new Date().toISOString(),
    deliveryDate: addDays(new Date(), 5).toISOString(),
    products: 'Wildflower mix with lavender.',
    totalValue: 65.0,
    status: 'Processing',
    specialInstructions: 'As natural looking as possible.',
  }
];

// For client-side state initialization
export const initialCustomers = [...customers];
export const initialOrders = [...orders];
