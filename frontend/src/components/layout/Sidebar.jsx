import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/files', icon: FileText, label: 'Files' },
    { path: '/approvals', icon: CheckCircle2, label: 'Approvals' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div
      className={`bg-background/95 backdrop-blur-md border-r border-border h-screen sticky top-0 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h2 className="font-bold text-lg tracking-tight text-primary" data-testid="app-title">
            Azure DT
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          data-testid="sidebar-toggle-btn"
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/10 text-foreground'
              }`
            }
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2" data-testid="user-info">
            <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize mt-1 font-mono">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={handleLogout}
          className="w-full justify-start"
          data-testid="logout-btn"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
