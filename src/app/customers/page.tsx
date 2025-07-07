
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, Eye, User, Search } from 'lucide-react';
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
import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { CustomerForm } from '@/components/customer-form';
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
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function CustomersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [customerToView, setCustomerToView] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching customers:", error);
        toast({ title: 'Error', description: 'Failed to fetch customers.', variant: 'destructive'});
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    return customers.filter(customer =>
      customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  const handleFormSubmit = async (customerData: Omit<Customer, 'id'>) => {
    try {
      if (editingCustomer) {
        // Edit
        const customerDoc = doc(db, 'customers', editingCustomer.id);
        const updateData = {
          ...customerData,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'System',
        }
        await updateDoc(customerDoc, updateData);
        toast({ title: 'Customer Updated', description: `${customerData.fullName} has been updated.` });
      } else {
        // Add
        const newCustomerData = {
          ...customerData,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || 'System',
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'System',
        }
        await addDoc(collection(db, 'customers'), newCustomerData);
        toast({ title: 'Customer Added', description: `${customerData.fullName} has been added.` });
      }
      handleCloseForm();
    } catch (error) {
        console.error("Error saving customer:", error);
        toast({ title: 'Error', description: 'Failed to save customer details.', variant: 'destructive'});
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };
  
  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
        await deleteDoc(doc(db, 'customers', customerToDelete.id));
        toast({ title: 'Customer Deleted', description: `${customerToDelete.fullName} has been deleted.`, variant: 'destructive' });
        setIsDeleteDialogOpen(false);
        setCustomerToDelete(null);
    } catch (error) {
        console.error("Error deleting customer:", error);
        toast({ title: 'Error', description: 'Failed to delete customer.', variant: 'destructive'});
    }
  };
  
  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  }

  const handleViewDetails = (customer: Customer) => {
    setCustomerToView(customer);
    setIsViewDialogOpen(true);
  };

  const handleCloseForm = () => {
    setEditingCustomer(null);
    setIsFormOpen(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search customers..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={() => { setEditingCustomer(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
        ) : filteredCustomers.length === 0 ? (
             <div className="text-center py-24 text-muted-foreground">
                <User className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">{searchTerm ? 'No customers found' : 'No customers yet'}</h3>
                <p className="text-sm">{searchTerm ? `Your search for "${searchTerm}" did not match any customers.` : 'Add a new customer to get started.'}</p>
            </div>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="p-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center justify-between transition-colors hover:bg-accent">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary shadow-neumorphic-inset">
                    <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="grid gap-0.5">
                    <p className="font-semibold">{customer.fullName}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone} {customer.email && `• ${customer.email}`}</p>
                </div>
              </div>
              <div className="self-end sm:self-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(customer)} className="text-destructive focus:text-destructive">
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update the customer's details." : 'Enter the new customer details.'}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Viewing full information for {customerToView?.fullName}.
            </DialogDescription>
          </DialogHeader>
          {customerToView && (
             <div className="space-y-4 py-4 text-sm">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Full Name</Label>
                    <span className="break-words">{customerToView.fullName}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Contact</Label>
                    <span className="break-words">{customerToView.phone}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Email</Label>
                    <span className="break-words">{customerToView.email || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-start sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right sm:mt-1">Address</Label>
                    <p className="leading-relaxed break-words">{customerToView.address}</p>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-start sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right sm:mt-1">Preferences</Label>
                    <p className="leading-relaxed break-words">{customerToView.preferences || 'N/A'}</p>
                </div>

                <Separator className="my-2" />
                <h4 className="font-semibold text-sm text-foreground">Action Centre</h4>
                
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Last Updated</Label>
                    <span className="break-words">{customerToView.updatedAt ? format(new Date(customerToView.updatedAt), 'PPp') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Updated By</Label>
                    <span className="break-words">{customerToView.updatedBy || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Created</Label>
                    <span className="break-words">{customerToView.createdAt ? format(new Date(customerToView.createdAt), 'PPp') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-x-4">
                    <Label className="text-muted-foreground sm:text-right">Created By</Label>
                    <span className="break-words">{customerToView.createdBy || 'N/A'}</span>
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
              This action cannot be undone. This will permanently delete the customer "{customerToDelete?.fullName}".
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
