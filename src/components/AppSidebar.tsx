import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, PlayCircle, MapPin, Settings } from "lucide-react";
import logo from "@/assets/logo.jpg";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Categories", url: "/categories", icon: FolderKanban },
  { title: "New Scrape", url: "/scrape/new", icon: PlayCircle },
  { title: "Places", url: "/places", icon: MapPin },
];
const sys = [{ title: "Settings", url: "/settings", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const active = (u: string) => pathname === u || pathname.startsWith(u + "/");

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={active(item.url)} tooltip={item.title}>
                <NavLink to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
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
          <img src={logo} alt="RSC logo" className="h-8 w-8 rounded-md object-cover shadow-md" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">RSC Scraper</div>
              <div className="text-[10px] text-muted-foreground">Maps Intelligence</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Workspace", main)}
        {renderGroup("System", sys)}
      </SidebarContent>
    </Sidebar>
  );
}
