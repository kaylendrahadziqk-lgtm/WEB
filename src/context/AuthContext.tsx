import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Address } from '../types';
import { dbStore } from '../data/dbStore';
import { INITIAL_USER, INITIAL_ADMIN } from '../data/mockData';

interface AuthContextType {
  user: User;
  isAdmin: boolean;
  switchUserRole: (role: 'USER' | 'ADMIN') => void;
  updateUserProfile: (data: Partial<User>) => void;
  primaryAddress: Address;
  savePrimaryAddress: (address: Address) => void;
}

const DEFAULT_ADDRESS: Address = {
  id: 'addr_default',
  label: 'Rumah Utama',
  recipientName: 'Budi Santoso',
  phone: '081234567890',
  provinceId: '6', // DKI Jakarta
  provinceName: 'DKI Jakarta',
  cityId: '153', // Jakarta Selatan
  cityName: 'Jakarta Selatan',
  cityType: 'Kota',
  postalCode: '12410',
  fullAddress: 'Jl. RS Fatmawati No. 45, Cilandak Barat',
  courierNotes: 'Pagar warna hitam',
  isPrimary: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => dbStore.getCurrentUser());
  const [primaryAddress, setPrimaryAddress] = useState<Address>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nusastore_address');
      return saved ? JSON.parse(saved) : DEFAULT_ADDRESS;
    }
    return DEFAULT_ADDRESS;
  });

  const isAdmin = user.role === 'ADMIN';

  const switchUserRole = (role: 'USER' | 'ADMIN') => {
    const newUser = role === 'ADMIN' ? INITIAL_ADMIN : INITIAL_USER;
    setUser(newUser);
    dbStore.setCurrentUser(newUser);
  };

  const updateUserProfile = (data: Partial<User>) => {
    const updated = { ...user, ...data };
    setUser(updated);
    dbStore.setCurrentUser(updated);
  };

  const savePrimaryAddress = (address: Address) => {
    setPrimaryAddress(address);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nusastore_address', JSON.stringify(address));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        switchUserRole,
        updateUserProfile,
        primaryAddress,
        savePrimaryAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
