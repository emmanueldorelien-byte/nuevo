import { createContext, useContext, useState } from "react";

interface AdminAuthContextType {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  unlocked: false,
  unlock: () => {},
  lock: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const unlock = () => setUnlocked(true);
  const lock = () => setUnlocked(false);

  return (
    <AdminAuthContext.Provider value={{ unlocked, unlock, lock }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
