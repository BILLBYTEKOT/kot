import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { logout } from '../App';
import NotificationBell from './NotificationBell';
import { 
  Home, UtensilsCrossed, ShoppingBag, Table, ChefHat, Package, 
  FileText, LogOut, Menu, X, Settings as SettingsIcon, Crown, Users, UserRound, Zap,
  MoreHorizontal, HelpCircle, TrendingDown, Gift, ChevronLeft, ChevronRight
} from 'lucide-react';

const Layout = ({ user, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebarCollapsed', String(collapsed));
    }
  }, [collapsed]);

  const handleLogout = () => {
    // Use the global logout function that clears both storage and React state
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { path: '/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/tables', icon: Table, label: 'Tables' },
    { path: '/counter-sale', icon: Zap, label: 'Counter Sale' },
    { path: '/kitchen', icon: ChefHat, label: 'Kitchen' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/expenses', icon: TrendingDown, label: 'Expenses' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/customers', icon: UserRound, label: 'Customers' },
  { path: '/staff', icon: Users, label: 'Staff', adminOnly: true },
    { path: '/refer-earn', icon: Gift, label: 'Refer & Earn' },
    { path: '/subscription', icon: Crown, label: 'Subscription' },
    { path: '/help', icon: HelpCircle, label: 'Help' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings', adminOnly: true }
  ];

  // Mobile bottom nav items (first 4 + more)
  const mobileNavItems = navItems.slice(0, 4);
  const moreNavItems = navItems.slice(4);

  return (
    <div className="min-h-screen flex bg-gray-50" data-testid="layout">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'} bg-white shadow-xl border-r border-gray-100 fixed h-full z-40 transition-[width] duration-300 ease-in-out`}>
        {/* Collapse / expand toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          data-testid="sidebar-toggle"
          className="absolute -right-3 top-8 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:bg-violet-50 hover:text-violet-600"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`border-b border-gray-100 ${collapsed ? 'px-3 py-6' : 'p-6'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {collapsed ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-bold text-white"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                BK
              </span>
            ) : (
              <>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" 
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  BillByteKOT AI
                </h1>
                <NotificationBell />
              </>
            )}
          </div>
          {!collapsed && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {user?.role?.toUpperCase()}
            </p>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} data-testid={`nav-${item.label.toLowerCase()}`} title={collapsed ? item.label : undefined}>
                <div className={`flex items-center rounded-xl transition-all duration-200 ${
                  collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200'
                    : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                }`}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                  {!collapsed && item.path === '/subscription' && !user?.subscription_active && (
                    <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">PRO</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-gray-100 ${collapsed ? 'p-2' : 'p-4'}`}>
          {!collapsed && (
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl mb-3">
              <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            title={collapsed ? 'Logout' : undefined}
            className={`w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 ${collapsed ? 'px-0' : ''}`}
            data-testid="logout-button"
          >
            <LogOut className={`w-4 h-4 ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent" 
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            BillByteKOT AI
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-1 rounded-full font-medium">
              {user?.role}
            </span>
            <NotificationBell />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl animate-slide-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              {navItems.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive ? 'bg-violet-100 text-violet-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset">
        <div className="flex justify-around items-center py-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex-1">
                <div className={`flex flex-col items-center py-2 ${
                  isActive ? 'text-violet-600' : 'text-gray-500'
                }`}>
                  <item.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <div className="flex-1 relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-full flex flex-col items-center py-2 ${showMoreMenu ? 'text-violet-600' : 'text-gray-500'}`}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">More</span>
            </button>
            
            {/* More Menu Popup */}
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-40">
                  {moreNavItems.map((item) => {
                    if (item.adminOnly && user?.role !== 'admin') return null;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setShowMoreMenu(false)}>
                        <div className={`flex items-center gap-3 px-4 py-3 ${
                          isActive ? 'bg-violet-50 text-violet-600' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen overflow-x-hidden transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Spacer for mobile header */}
        <div className="lg:hidden h-14"></div>
        
        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Slide-in animation style */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .safe-area-inset {
          padding-bottom: max(8px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default Layout;
