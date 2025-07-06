
export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  preferences?: string;
  createdAt?: string; // ISO string
  createdBy?: string; // user email
  updatedAt?: string; // ISO string
  updatedBy?: string; // user email
};

export type OrderStatus = 'COD' | 'Advance Taken' | 'Completed';

export type Order = {
  id: string;
  orderId: string;
  customerId: string;
  orderDate: string; // ISO string
  deliveryDate: string; // ISO string
  products: string;
  totalValue: number;
  status: OrderStatus;
  advanceAmount?: number;
  specialInstructions: string;
  createdAt?: string; // ISO string
  createdBy?: string; // user email
  updatedAt?: string; // ISO string
  updatedBy?: string; // user email
};
