import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, PosTerminal, PermissionCode } from '../types/erp';
import { db } from '../services/db/store';
import { initializeDatabaseIfEmpty } from '../services/seedData';

interface AuthContextType {
  currentUser: User;
  availableUsers: User[];
  activeBranch: Branch;
  availableBranches: Branch[];
  activeTerminal?: PosTerminal;
  availableTerminals: PosTerminal[];
  switchUser: (userId: string) => void;
  switchBranch: (branchId: string) => void;
  switchTerminal: (terminalId: string) => void;
  hasPermission: (permission: PermissionCode) => boolean;
  verifySupervisorPin: (pin: string) => { valid: boolean; supervisor?: User };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  initializeDatabaseIfEmpty();

  const [availableUsers, setAvailableUsers] = useState<User[]>(() => db.collection('users').find());
  const [currentUser, setCurrentUser] = useState<User>(() => availableUsers[0]);

  const [availableBranches, setAvailableBranches] = useState<Branch[]>(() => db.collection('branches').find());
  const [activeBranch, setActiveBranch] = useState<Branch>(() => {
    return availableBranches.find(b => b.id === currentUser.defaultBranchId) || availableBranches[0];
  });

  const [availableTerminals, setAvailableTerminals] = useState<PosTerminal[]>(() => {
    return db.collection('terminals').find((t: PosTerminal) => t.branchId === activeBranch?.id);
  });
  const [activeTerminal, setActiveTerminal] = useState<PosTerminal | undefined>(() => availableTerminals[0]);

  // Keep state in sync if DB changes
  useEffect(() => {
    const unsub = db.subscribe(() => {
      const users = db.collection('users').find();
      const branches = db.collection('branches').find();
      setAvailableUsers(users);
      setAvailableBranches(branches);

      const updatedUser = users.find((u: User) => u.id === currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    });
    return unsub;
  }, [currentUser.id]);

  useEffect(() => {
    const terms = db.collection('terminals').find((t: PosTerminal) => t.branchId === activeBranch?.id);
    setAvailableTerminals(terms);
    if (!terms.find((t: PosTerminal) => t.id === activeTerminal?.id)) {
      setActiveTerminal(terms[0]);
    }
  }, [activeBranch]);

  const switchUser = (userId: string) => {
    const found = availableUsers.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      const defaultBr = availableBranches.find(b => b.id === found.defaultBranchId) || availableBranches[0];
      setActiveBranch(defaultBr);
    }
  };

  const switchBranch = (branchId: string) => {
    const found = availableBranches.find(b => b.id === branchId);
    if (found) {
      setActiveBranch(found);
    }
  };

  const switchTerminal = (terminalId: string) => {
    const found = availableTerminals.find(t => t.id === terminalId);
    if (found) {
      setActiveTerminal(found);
    }
  };

  const hasPermission = (permission: PermissionCode): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.permissions.includes(permission);
  };

  const verifySupervisorPin = (pin: string): { valid: boolean; supervisor?: User } => {
    const users = db.collection('users').find();
    const supervisor = users.find(
      (u: User) =>
        (u.role === 'SUPER_ADMIN' || u.role === 'STORE_MANAGER' || u.role === 'SYSTEM_ADMIN') &&
        u.supervisorPin === pin
    );
    if (supervisor) {
      return { valid: true, supervisor };
    }
    return { valid: false };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        activeBranch,
        availableBranches,
        activeTerminal,
        availableTerminals,
        switchUser,
        switchBranch,
        switchTerminal,
        hasPermission,
        verifySupervisorPin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
