import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Landmark,
  PiggyBank,
  WalletCards,
  FileText
} from 'lucide-react';

const menu = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/loans', label: 'Loans', icon: HandCoins },
  { to: '/rd', label: 'RD', icon: PiggyBank },
  { to: '/fd', label: 'FD', icon: Landmark },
  { to: '/chits', label: 'Chit Funds', icon: WalletCards },
  { to: '/reports', label: 'Reports', icon: FileText }
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-full md:w-64 bg-[var(--sidebar)] text-white md:min-h-screen p-4 md:p-6">
      <h1 className="text-lg font-extrabold tracking-tight mb-6">Finance & Chit</h1>
      <nav className="space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-[var(--sidebar-accent)]' : 'hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
