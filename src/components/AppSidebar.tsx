import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Search, Upload, Mail, History, Settings, Sparkles } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Lead Scraper", url: "/scraper", icon: Search },
  { title: "CSV Upload", url: "/csv-upload", icon: Upload },
];
const email = [
  { title: "Campaigns", url: "/campaigns", icon: Mail },
  { title: "History", url: "/history", icon: History },
];
const sys = [{ title: "Settings", url: "/settings", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = (u: string) => path === u || path.startsWith(u + "/");

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={active(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">LeadForge</div>
              <div className="text-[10px] text-muted-foreground">Demo SaaS</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Workspace", main)}
        {renderGroup("Email", email)}
        {renderGroup("System", sys)}
      </SidebarContent>
    </Sidebar>
  );
}
