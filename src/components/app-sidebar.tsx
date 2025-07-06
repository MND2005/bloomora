
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Flower2,
} from 'lucide-react';
import { AppHeader } from './app-header';

function AppSidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Flower2 className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
              <h2 className="text-lg font-headline font-semibold">Bloomora</h2>
              <p className="text-xs text-muted-foreground">Order Management</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip="Dashboard"
              >
                <Link href="/" onClick={handleLinkClick}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/orders')}
                tooltip="Orders"
              >
                <Link href="/orders" onClick={handleLinkClick}>
                  <ClipboardList />
                  <span>Orders</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/customers')}
                tooltip="Customers"
              >
                <Link href="/customers" onClick={handleLinkClick}>
                  <Users />
                  <span>Customers</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">{children}</main>
            <footer className="p-4 text-center text-xs text-muted-foreground">
                Powered by Manuja Niroshan
            </footer>
        </div>
      </SidebarInset>
    </>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebarLayout>{children}</AppSidebarLayout>
    </SidebarProvider>
  );
}
