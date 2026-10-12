import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, Product, Coupon } from '../types';
import { dbStore } from '../data/dbStore';
import { useToast } from './ToastContext';
import { MOCK_COUPONS } from '../data/mockData';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variantName?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotalAmount: number;
  totalWeightGrams: number;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => dbStore.getCart());
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { showToast } = useToast();

  // Save cart changes to dbStore
  useEffect(() => {
    dbStore.saveCart(cart);
  }, [cart]);

  const addToCart = (product: Product, quantity = 1, variantName?: string) => {
    if (product.stock <= 0) {
      showToast('Stok produk habis!', 'error');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variantName === variantName
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const newQty = Math.min(product.stock, currentQty + quantity);
        updated[existingIndex].quantity = newQty;
        showToast(
          `Jumlah ${product.name} diperbarui di keranjang (${newQty}x)`,
          'success'
        );
        return updated;
      } else {
        const price = product.discountPrice || product.price;
        const newItem: CartItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          product,
          variantName,
          quantity: Math.min(product.stock, quantity),
          price,
          weight: product.weight || 500,
        };
        showToast(`${product.name} berhasil ditambahkan ke keranjang!`, 'success');
        return [...prev, newItem];
      }
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
    showToast('Produk dihapus dari keranjang', 'info');
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const maxStock = item.product.stock;
          const validQty = Math.min(maxStock, newQty);
          if (newQty > maxStock) {
            showToast(`Maksimal stok tersedia adalah ${maxStock}`, 'error');
          }
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    dbStore.clearCart();
  };

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalWeightGrams = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.weight || 500) * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (subtotalAmount < appliedCoupon.minPurchase) return 0;

    if (appliedCoupon.discountType === 'percentage') {
      const calc = (subtotalAmount * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maxDiscount ? Math.min(calc, appliedCoupon.maxDiscount) : calc;
    } else {
      return appliedCoupon.discountValue;
    }
  }, [appliedCoupon, subtotalAmount]);

  const applyCoupon = (code: string): boolean => {
    const found = MOCK_COUPONS.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase()
    );

    if (!found) {
      showToast('Kode kupon tidak valid.', 'error');
      return false;
    }

    if (subtotalAmount < found.minPurchase) {
      showToast(
        `Minimal pembelian untuk kupon ${found.code} adalah Rp${found.minPurchase.toLocaleString('id-ID')}`,
        'error'
      );
      return false;
    }

    setAppliedCoupon(found);
    showToast(`Kupon ${found.code} berhasil dipasang!`, 'success');
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Kupon dilepas.', 'info');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotalAmount,
        totalWeightGrams,
        appliedCoupon,
        discountAmount,
        applyCoupon,
        removeCoupon,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
