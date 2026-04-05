import { LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { admin, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div>
        <p className="text-sm text-slate-500">Welcome back</p>
        <h2 className="text-lg font-bold text-slate-800">{admin?.name || 'Admin'}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
          <UserCircle2 size={18} />
          {admin?.email}
        </div>
        <button
          type="button"
          onClick={logout}
          className="btn-secondary !rounded-lg !px-3 !py-2"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
