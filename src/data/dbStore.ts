import {
  Product,
  Category,
  Order,
  CartItem,
  User,
  StoreSettings,
  OrderStatus,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  MOCK_ORDERS,
  INITIAL_USER,
  INITIAL_ADMIN,
} from './mockData';
import { DEFAULT_STORE_SETTINGS } from '../lib/rajaongkir';

const STORAGE_KEYS = {
  PRODUCTS: 'nusastore_products_v1',
  CATEGORIES: 'nusastore_categories_v1',
  ORDERS: 'nusastore_orders_v1',
  CART: 'nusastore_cart_v1',
  USER: 'nusastore_user_v1',
  SETTINGS: 'nusastore_settings_v1',
  THEME: 'nusastore_theme_v1',
  WISHLIST: 'nusastore_wishlist_v1',
  REVIEWS: 'nusastore_reviews_v1',
};

// Helper for local storage read with default fallback
function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key} from localStorage:`, e);
    return defaultValue;
  }
}

// Helper for local storage write
function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error setting key ${key} in localStorage:`, e);
  }
}

// Store management class
class DBStore {
  // PRODUCTS
  getProducts(): Product[] {
    return getStored<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.getProducts().find((p) => p.slug === slug || p.id === slug);
  }

  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    let updated: Product[];

    if (index >= 0) {
      products[index] = { ...product, updatedAt: new Date().toISOString() };
      updated = products;
    } else {
      updated = [
        {
          ...product,
          id: product.id || `prod_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...products,
      ];
    }

    setStored(STORAGE_KEYS.PRODUCTS, updated);
    return product;
  }

  deleteProduct(productId: string): void {
    const products = this.getProducts().filter((p) => p.id !== productId);
    setStored(STORAGE_KEYS.PRODUCTS, products);
  }

  // CATEGORIES
  getCategories(): Category[] {
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  saveCategory(category: Category): Category {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    let updated: Category[];
    if (index >= 0) {
      categories[index] = category;
      updated = categories;
    } else {
      updated = [...categories, { ...category, id: category.id || `cat_${Date.now()}` }];
    }
    setStored(STORAGE_KEYS.CATEGORIES, updated);
    return category;
  }

  // CART
  getCart(): CartItem[] {
    return getStored<CartItem[]>(STORAGE_KEYS.CART, []);
  }

  saveCart(cart: CartItem[]): void {
    setStored(STORAGE_KEYS.CART, cart);
  }

  clearCart(): void {
    setStored(STORAGE_KEYS.CART, []);
  }

  // ORDERS
  getOrders(): Order[] {
    return getStored<Order[]>(STORAGE_KEYS.ORDERS, MOCK_ORDERS);
  }

  getOrderById(orderId: string): Order | undefined {
    return this.getOrders().find((o) => o.id === orderId || o.orderNumber === orderId);
  }

  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const orders = this.getOrders();
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Deduct inventory stock safely
    const products = this.getProducts();
    for (const item of newOrder.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.soldCount = (prod.soldCount || 0) + item.quantity;
      }
    }
    setStored(STORAGE_KEYS.PRODUCTS, products);

    // Save order
    const updatedOrders = [newOrder, ...orders];
    setStored(STORAGE_KEYS.ORDERS, updatedOrders);
    this.clearCart();

    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string,
    courierName?: string
  ): Order | undefined {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index < 0) return undefined;

    const targetOrder = orders[index];
    targetOrder.status = status;
    targetOrder.updatedAt = new Date().toISOString();

    if (trackingNumber) {
      targetOrder.shippingDetail.trackingNumber = trackingNumber;
    }
    if (courierName) {
      targetOrder.shippingDetail.courierName = courierName;
    }

    if (status === 'Dibayar') {
      targetOrder.payment.status = 'success';
      targetOrder.payment.paidAt = new Date().toISOString();
    }

    orders[index] = targetOrder;
    setStored(STORAGE_KEYS.ORDERS, orders);
    return targetOrder;
  }

  updateOrder(updatedOrder: Order): Order {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === updatedOrder.id);
    if (index >= 0) {
      orders[index] = { ...updatedOrder, updatedAt: new Date().toISOString() };
      setStored(STORAGE_KEYS.ORDERS, orders);
    }
    return updatedOrder;
  }

  // CURRENT USER & ROLE
  getUsers(): User[] {
    return [INITIAL_USER, INITIAL_ADMIN];
  }

  getCurrentUser(): User {
    return getStored<User>(STORAGE_KEYS.USER, INITIAL_USER);
  }

  setCurrentUser(user: User): void {
    setStored(STORAGE_KEYS.USER, user);
  }

  // STORE SETTINGS
  getStoreSettings(): StoreSettings {
    return getStored<StoreSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_STORE_SETTINGS);
  }

  saveStoreSettings(settings: StoreSettings): StoreSettings {
    setStored(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  }

  // WISHLIST MANAGEMENT
  getWishlist(): string[] {
    return getStored<string[]>(STORAGE_KEYS.WISHLIST, []);
  }

  isInWishlist(productId: string): boolean {
    return this.getWishlist().includes(productId);
  }

  toggleWishlist(productId: string): boolean {
    const list = this.getWishlist();
    let updated: string[];
    let added = false;

    if (list.includes(productId)) {
      updated = list.filter((id) => id !== productId);
    } else {
      updated = [...list, productId];
      added = true;
    }

    setStored(STORAGE_KEYS.WISHLIST, updated);
    return added;
  }

  // REVIEWS MANAGEMENT
  getReviews(productId?: string): import('../types').Review[] {
    const defaultReviews: import('../types').Review[] = [
      {
        id: 'rev_1',
        productId: 'prod_1',
        userName: 'Budi Santoso',
        rating: 5,
        comment: 'Barang sangat memuaskan, pengiriman JNE super cepat dan dibungkus bubble wrap tebal!',
        createdAt: '2026-07-20T10:00:00Z',
      },
      {
        id: 'rev_2',
        productId: 'prod_1',
        userName: 'Siti Rahma',
        rating: 5,
        comment: 'Produk 100% original garansi resmi, seller ramah dan fast respon. Pokoknya recommended!',
        createdAt: '2026-07-22T14:30:00Z',
      },
      {
        id: 'rev_3',
        productId: 'prod_2',
        userName: 'Andi Wijaya',
        rating: 4,
        comment: 'Kualitas mantap, sesuai dengan deskripsi. Ongkir RajaOngkir terjangkau.',
        createdAt: '2026-07-25T09:15:00Z',
      },
    ];

    const reviews = getStored<import('../types').Review[]>(STORAGE_KEYS.REVIEWS, defaultReviews);
    if (productId) {
      return reviews.filter((r) => r.productId === productId);
    }
    return reviews;
  }

  addReview(reviewData: Omit<import('../types').Review, 'id' | 'createdAt'>): import('../types').Review {
    const reviews = this.getReviews();
    const newRev: import('../types').Review = {
      ...reviewData,
      id: `rev_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedReviews = [newRev, ...reviews];
    setStored(STORAGE_KEYS.REVIEWS, updatedReviews);

    // Recalculate average rating for product
    const productReviews = updatedReviews.filter((r) => r.productId === reviewData.productId);
    const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / productReviews.length;

    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === reviewData.productId);
    if (prodIndex >= 0) {
      products[prodIndex].rating = Number(avgRating.toFixed(1));
      products[prodIndex].reviewCount = productReviews.length;
      setStored(STORAGE_KEYS.PRODUCTS, products);
    }

    return newRev;
  }

  // RESET DEMO DATA
  resetToDefaults(): void {
    setStored(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setStored(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setStored(STORAGE_KEYS.ORDERS, MOCK_ORDERS);
    setStored(STORAGE_KEYS.CART, []);
    setStored(STORAGE_KEYS.USER, INITIAL_USER);
    setStored(STORAGE_KEYS.SETTINGS, DEFAULT_STORE_SETTINGS);
  }
}

export const dbStore = new DBStore();
