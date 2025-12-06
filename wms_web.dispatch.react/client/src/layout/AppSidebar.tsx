import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  BarChart3, 
  Users, 
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  DollarSign
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, setIsMobileOpen, setIsExpanded } = useSidebar();
  const { user, logout, canAccessMenu } = useAuth();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const [manuallyOpened, setManuallyOpened] = useState<string | null>(null); // Track manually opened submenus
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    if (!user) return [];
    
    const allNavItems: NavItem[] = [
      {
        icon: <LayoutDashboard className="w-6 h-6" />,
        name: "Dashboard",
        path: "/dashboard",
      },
      {
        icon: <Package className="w-6 h-6" />,
        name: "Parcels",
        subItems: [
          { name: "All Parcels", path: "/parcels" },
          { name: "Collection", path: "/branch-parcels" }
        ],
      },
      {
        icon: <Truck className="w-6 h-6" />,
        name: "Dispatches",
        subItems: [
          { name: "View Dispatches", path: "/dispatches/view" },
          { name: "Create Dispatch", path: "/dispatches/create" }
        ],
      },
      {
        icon: <BarChart3 className="w-6 h-6" />,
        name: "Reports",
        path: "/reports",
      },
      {
        icon: <DollarSign className="w-6 h-6" />,
        name: "Financial",
        subItems: [
          { name: "Dashboard", path: "/financial-dashboard" },
          { name: "Invoices", path: "/invoices" },
          { name: "Payments", path: "/payments" },
          { name: "Expenses", path: "/expenses" }
        ],
      },
      {
        icon: <Building2 className="w-6 h-6" />,
        name: "Contract Customers",
        path: "/contract-customers",
      },
      {
        icon: <Users className="w-6 h-6" />,
        name: "User Management", 
        path: "/user-management",
      },
      {
        icon: <ShieldCheck className="w-6 h-6" />,
        name: "Manage Parcels", 
        path: "/admin/parcels",
      },
      {
        icon: <Settings className="w-6 h-6" />,
        name: "Settings",
        path: "/settings",
      },
    ];

    return allNavItems.filter(item => {
      // Check main path access
      if (item.path && !canAccessMenu(item.path)) {
        return false;
      }
      
      // Check sub-items access
      if (item.subItems) {
        const accessibleSubItems = item.subItems.filter(subItem => 
          canAccessMenu(subItem.path)
        );
        
        // Only show parent item if at least one sub-item is accessible
        if (accessibleSubItems.length === 0) {
          return false;
        }
        
        // Update the item with only accessible sub-items (create a new object to avoid mutations)
        return {
          ...item,
          subItems: accessibleSubItems
        };
      }
      
      return true;
    }).map(item => {
      // Handle subItems properly
      if (item.subItems) {
        const accessibleSubItems = item.subItems.filter(subItem => 
          canAccessMenu(subItem.path)
        );
        return {
          ...item,
          subItems: accessibleSubItems
        };
      }
      return item;
    });
  }, [user, canAccessMenu]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );


  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(nav.name);
            submenuMatched = true;
          }
        });
      }
    });

    // Only close submenu if we're navigating to a route that should close it
    // Don't auto-close manually opened submenus
    if (!submenuMatched && !manuallyOpened) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems, manuallyOpened]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = openSubmenu;
      
      // Use requestAnimationFrame to ensure DOM is rendered
      requestAnimationFrame(() => {
        if (subMenuRefs.current[key]) {
          const element = subMenuRefs.current[key];
          const scrollHeight = element?.scrollHeight || 0;
          setSubMenuHeight((prevHeights) => ({
            ...prevHeights,
            [key]: Math.max(scrollHeight, 80), // Fallback to 80px minimum
          }));
        }
      });
    } else {
      // Reset all heights when no submenu is open
      setSubMenuHeight({});
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (itemName: string) => {
    // If sidebar is collapsed on desktop, expand it first
    if (!isExpanded && !isMobileOpen && window.innerWidth >= 1024) {
      setIsExpanded(true);
    }
    
    setOpenSubmenu((prevOpenSubmenu) => {
      const newState = prevOpenSubmenu === itemName ? null : itemName;
      
      // Track manually opened submenus
      setManuallyOpened(newState);
      
      return newState;
    });
  };

  const handleLogout = () => {
    logout();
  };

  // Close mobile sidebar when navigating to a new page
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname && isMobileOpen) {
      setIsMobileOpen(false);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, isMobileOpen, setIsMobileOpen]);

  if (!user) return null;

  return (
    <aside
      className={clsx(
        "fixed top-0 left-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out",
        {
          // Mobile: Always full width when open, hidden when closed
          "w-64 translate-x-0": isMobileOpen,
          "-translate-x-full": !isMobileOpen && window.innerWidth < 1024,
          // Desktop: Full width when expanded OR (collapsed but hovered)
          "lg:w-64 lg:translate-x-0": isExpanded || (isHovered && !isExpanded),
          "lg:w-20 lg:translate-x-0": !isExpanded && !isHovered,
        }
      )}
      onMouseEnter={() => !isExpanded && window.innerWidth >= 1024 && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
        <Link to="/dashboard" className="flex items-center space-x-3">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  NID Logistics
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Dispatch System
                </span>
              </div>
            </>
          ) : (
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          )}
        </Link>
        
        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* User Info */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                {(() => {
                  const roleName = typeof user.role === 'string' ? user.role : (user.role as any)?.Name || 'User';
                  return roleName.replace('_', ' ');
                })()}
              </p>
              {user.branch && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {user.branch.name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {/* Navigation Section Header */}
        {(isExpanded || isHovered || isMobileOpen) && (
          <div className="px-3 mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Menu
            </h2>
          </div>
        )}
        
        {navItems.map((nav) => {
          return (
            <div key={nav.name}>
              {nav.subItems ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmenuToggle(nav.name);
                  }}
                  className={clsx(
                    "menu-item group w-full text-left",
                    {
                      "menu-item-active": openSubmenu === nav.name,
                      "menu-item-inactive": openSubmenu !== nav.name,
                      "justify-center": !isExpanded && !isHovered && !isMobileOpen,
                      "justify-start": isExpanded || isHovered || isMobileOpen,
                    }
                  )}
                >
                  <span
                    className={clsx("flex-shrink-0", {
                      "menu-item-icon-active": openSubmenu === nav.name,
                      "menu-item-icon-inactive": openSubmenu !== nav.name,
                    })}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="flex-1">{nav.name}</span>
                      <ChevronDown
                        className={clsx(
                          "w-4 h-4 transition-transform duration-200",
                          {
                            "rotate-180": openSubmenu === nav.name,
                            "text-brand-500": openSubmenu === nav.name,
                          }
                        )}
                      />
                    </>
                  )}
                </button>
              ) : (
                nav.path && (
                  <Link
                    to={nav.path}
                    className={clsx(
                      "menu-item group",
                      {
                        "menu-item-active": isActive(nav.path),
                        "menu-item-inactive": !isActive(nav.path),
                        "justify-center": !isExpanded && !isHovered && !isMobileOpen,
                        "justify-start": isExpanded || isHovered || isMobileOpen,
                      }
                    )}
                  >
                    <span
                      className={clsx("flex-shrink-0", {
                        "menu-item-icon-active": isActive(nav.path),
                        "menu-item-icon-inactive": !isActive(nav.path),
                      })}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span>{nav.name}</span>
                    )}
                  </Link>
                )
              )}

              {/* Submenu */}
              {nav.subItems && (isExpanded || isHovered || isMobileOpen || openSubmenu === nav.name) && (
                <div
                  ref={(el) => {
                    subMenuRefs.current[nav.name] = el;
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu === nav.name
                        ? `${subMenuHeight[nav.name] || 0}px`
                        : "0px",
                  }}
                >
                  <div className="mt-2 space-y-1 ml-9">
                    {nav.subItems.map((subItem) => {
                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className={clsx(
                            "menu-dropdown-item",
                            {
                              "menu-dropdown-item-active": isActive(subItem.path),
                              "menu-dropdown-item-inactive": !isActive(subItem.path),
                            }
                          )}
                        >
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
        <button
          onClick={handleLogout}
          className={clsx(
            "menu-item group w-full text-left text-error-600 hover:bg-error-50 hover:text-error-700 dark:text-error-400 dark:hover:bg-error-500/10 dark:hover:text-error-300",
            {
              "justify-center": !isExpanded && !isHovered && !isMobileOpen,
              "justify-start": isExpanded || isHovered || isMobileOpen,
            }
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="font-medium">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;