import { useMemo, useState, useEffect, createElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  HelpCircle,
  LayoutDashboard,
  BellDot,
  Menu,
  MessagesSquare,
  Plus,
  Search,
  Shield,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useNotifications } from "./contexts/NotificationContext";
import { useAuth } from "./contexts/AuthContext";

function getPageTitle(pathname) {
  if (pathname.startsWith("/admin")) return "Admin Dashboard";
  if (pathname.startsWith("/discussion")) return "Student Discussion";
  if (pathname === "/resources/dashboard") return "Resources Dashboard";
  if (pathname === "/resources/upload") return "Upload Resource";
  if (pathname === "/resources/browse") return "Browse Resources";
  if (pathname.startsWith("/resources")) return "Resource Sharing";
  if (pathname.startsWith("/help-request/dashboard")) return "Help Dashboard";
  if (pathname.startsWith("/help-request/new")) return "Post Help Request";
  if (pathname.startsWith("/help-request")) return "Help Requests";
  if (pathname.startsWith("/progress")) return "My Progress";
  return "Dashboard";
}

function SidebarLink({ to, label, icon: Icon, active, onNavigate }) {
  return (
    <Link
      to={to}
      className={`sidebarLink ${active ? "sidebarLinkActive" : ""}`}
      onClick={onNavigate}
    >
      {createElement(Icon, { size: 18 })}
      <span>{label}</span>
    </Link>
  );
}

function isRouteMatch(to, pathname, search) {
  const [targetPath, targetQuery = ""] = String(to).split("?");
  if (pathname !== targetPath) return false;
  if (!targetQuery) return true;

  const expectedParams = new URLSearchParams(targetQuery);
  const currentParams = new URLSearchParams(search);

  for (const [key, value] of expectedParams.entries()) {
    if (currentParams.get(key) !== value) return false;
  }
  return true;
}

function DropdownLink({
  label,
  icon: Icon,
  active,
  items,
  activeDropdown,
  onToggle,
  onNavigate,
  isSubItemActive,
}) {
  const isOpen = activeDropdown === label;
  const menuId = `${label.toLowerCase().replace(/\s+/g, "-")}-submenu`;
  const checkSubItemActive =
    typeof isSubItemActive === "function" ? isSubItemActive : () => false;

  return (
    <div className="sidebarDropdownGroup">
      <button
        type="button"
        className={`sidebarLink ${active ? "sidebarCategoryActive" : ""}`}
        onClick={() => onToggle(label)}
        aria-expanded={isOpen}
        aria-controls={menuId}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {createElement(Icon, { size: 18 })}
          <span>{label}</span>
        </div>
        {createElement(ChevronDown, {
          className: "sidebarChevron",
          size: 14,
          style: { transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" },
        })}
      </button>
      <div
        id={menuId}
        className={`sidebarSubmenu ${isOpen ? "sidebarSubmenuOpen" : ""}`}
      >
        {items.map((item) => {
          const isActive = checkSubItemActive(item.to);
          const itemClasses = [
            "sidebarSubLink",
            item.kind === "action" ? "sidebarSubLinkAction" : "",
            isActive ? "sidebarSubLinkActive" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={item.to}
              to={item.to}
              className={itemClasses}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DashboardLayout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const isSubItemActive = (to) => isRouteMatch(to, pathname, search);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { user, logout, isAdmin } = useAuth();

  const handleToggleDropdown = (label) => {
    setActiveDropdown((prev) => (prev === label ? null : label));
  };

  useEffect(() => {
    if (pathname.startsWith("/discussion")) {
      setActiveDropdown("Discussion");
      return;
    }
    if (pathname.startsWith("/resources")) {
      setActiveDropdown("Resources");
      return;
    }
    if (pathname.startsWith("/progress")) {
      setActiveDropdown("My Progress");
    }
  }, [pathname]);

  const initials = useMemo(() => {
    if (!user?.name) return "UC";
    return user.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { to: "/admin/discussion", label: "Admin Panel", icon: Shield },
        {
          to: "/admin/help-requests",
          label: "Help Requests",
          icon: HelpCircle,
        },
      ];
    }
    return [];
  }, [isAdmin]);

  const resourcesDropdownItems = [
    { to: "/resources/dashboard", label: "Dashboard" },
    { to: "/resources/browse", label: "Browse Resources" },
    { to: "/resources/upload", label: "Upload Resource", kind: "action" },
  ];

  const discussionDropdownItems = [
    { to: "/discussion?view=dashboard", label: "Dashboard" },
    { to: "/discussion?view=feed", label: "Feed" },
    { to: "/discussion?view=thread", label: "Thread View" },
    { to: "/discussion?view=mine", label: "My Posts" },
    { to: "/discussion?view=create", label: "Create Post", kind: "action" },
  ];

  const progressDropdownItems = [
    { to: "/progress", label: "Dashboard" },
    { to: "/progress?tab=history", label: "Activity History" },
    // { to: "/progress?tab=badges", label: "Badges" },
    { to: "/progress?tab=progress", label: "Progress" },
  ];

  const helpRequestDropdownItems = [
    { to: "/help-request/dashboard", label: "My Help Dashboard" },
    { to: "/help-request", label: "Browse Requests" },
    { to: "/help-request/accepted", label: "My Accepted Tasks" },
    { to: "/help-request/new", label: "Post New Request" },
  ];

  return (
    <div className={`dashboardShell ${sidebarOpen ? "sidebarOpen" : ""}`}>
      <aside className="sidebar" aria-label="Sidebar Navigation">
        <div className="sidebarBrand">
          <div className="brandMark" aria-hidden>
            UC
          </div>
          <div>
            <div className="brandName">UniConnect</div>
            <div className="brandTag">Academic Dashboard</div>
          </div>
        </div>

        <nav className="sidebarNav">
          {/* Discussion dropdown - only for students */}
          {!isAdmin && (
            <DropdownLink
              label="Discussion"
              icon={MessagesSquare}
              active={pathname.startsWith("/discussion")}
              items={discussionDropdownItems}
              activeDropdown={activeDropdown}
              onToggle={handleToggleDropdown}
              onNavigate={() => setSidebarOpen(false)}
              isSubItemActive={isSubItemActive}
            />
          )}

          {/* Resources dropdown - only for students */}
          {!isAdmin && (
            <DropdownLink
              label="Resources"
              icon={BookOpen}
              active={pathname.startsWith("/resources")}
              items={resourcesDropdownItems}
              activeDropdown={activeDropdown}
              onToggle={handleToggleDropdown}
              onNavigate={() => setSidebarOpen(false)}
              isSubItemActive={isSubItemActive}
            />
          )}

          {navLinks.map((link) => (
            <SidebarLink
              key={link.to}
              to={link.to}
              label={link.label}
              icon={link.icon}
              active={pathname === link.to}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}

          {/* Help Requests dropdown - only for students */}
          {!isAdmin && (
            <DropdownLink
              label="Help Requests"
              icon={HelpCircle}
              active={pathname.startsWith("/help-request")}
              items={helpRequestDropdownItems}
              activeDropdown={activeDropdown}
              onToggle={handleToggleDropdown}
              onNavigate={() => setSidebarOpen(false)}
              isSubItemActive={isSubItemActive}
            />
          )}

          {/* My Progress dropdown - only for students */}
          {!isAdmin && (
            <DropdownLink
              label="My Progress"
              icon={BarChart3}
              active={pathname.startsWith("/progress")}
              items={progressDropdownItems}
              activeDropdown={activeDropdown}
              onToggle={handleToggleDropdown}
              onNavigate={() => setSidebarOpen(false)}
              isSubItemActive={isSubItemActive}
            />
          )}
        </nav>

        <div className="sidebarFooter">
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginBottom: "4px",
            }}
          >
            <strong style={{ color: "var(--text)" }}>{user?.name}</strong>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--muted2)",
              marginBottom: "10px",
              textTransform: "capitalize",
            }}
          >
            {user?.role}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(var(--danger-rgb), 0.10)",
              color: "var(--danger)",
              border: "1px solid rgba(var(--danger-rgb), 0.30)",
              borderRadius: "8px",
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "700",
              width: "100%",
            }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      <div
        className="sidebarBackdrop"
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      <header className="topbar">
        <div className="topbarLeft">
          <button
            type="button"
            className="mobileMenuBtn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Open navigation"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbarTitle">
            <LayoutDashboard size={18} />
            {getPageTitle(pathname)}
          </div>
        </div>

        <div className="topbarRight">
          <div className="topbarSearch" role="search" aria-label="Search">
            <Search size={16} />
            <input placeholder="Search (coming soon)" disabled />
          </div>
          <button
            type="button"
            className="notifBtn"
            onClick={() => {
              setNotifOpen((v) => !v);
              markAllRead();
            }}
            aria-label="Notifications"
          >
            <BellDot size={18} />
            {unreadCount > 0 && (
              <span className="notifCount">{unreadCount}</span>
            )}
          </button>
          <div className="userChip" aria-label="Current user">
            <span aria-hidden>{initials}</span>
          </div>
        </div>
      </header>

      {notifOpen && (
        <div
          className="notifDropdown"
          role="dialog"
          aria-label="Notifications list"
        >
          <div className="notifHeader">
            <div className="notifHeaderTitle">Notifications</div>
            <button
              type="button"
              className="notifMarkRead"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          </div>
          <div className="notifList">
            {notifications.length === 0 ? (
              <div className="notifEmpty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={`notifItem ${n.read ? "notifItemRead" : ""}`}
                >
                  <div className="notifItemTitle">{n.title}</div>
                  <div className="notifItemMessage">{n.message}</div>
                  <div className="notifMeta">
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <main className="main">
        <div className="mainContent">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
