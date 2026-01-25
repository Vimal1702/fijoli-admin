import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileHeader } from "./AdminMobileHeader";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <AdminMobileHeader />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}