import { 
  User, 
  MenuItem, 
  CartItem, 
  Order, 
  InsertUser, 
  InsertMenuItem, 
  InsertCartItem, 
  InsertOrder, 
  CartItemWithDetails,
  OrderWithItems,
  OrderStatus
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import dotenv from 'dotenv';
dotenv.config();

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Menu item methods
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(category: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: InsertMenuItem): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Cart methods
  getCartItems(userId: number): Promise<CartItem[]>;
  getCartItemsWithDetails(userId: number): Promise<CartItemWithDetails[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  removeFromCart(id: number, userId: number): Promise<boolean>;
  updateCartItemQuantity(id: number, userId: number, quantity: number): Promise<CartItem | undefined>;
  clearCart(userId: number): Promise<boolean>;
  
  // Order methods
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByUserId(userId: number): Promise<OrderWithItems[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItems: Map<number, MenuItem>;
  private cartItems: Map<number, CartItem>;
  private orders: Map<number, Order>;
  
  private userIdCounter: number;
  private menuItemIdCounter: number;
  private cartItemIdCounter: number;
  private orderIdCounter: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    
    this.userIdCounter = 1;
    this.menuItemIdCounter = 1;
    this.cartItemIdCounter = 1;
    this.orderIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Seed with default admin user
    this.createUser({
      username: "admin",
      password: "admin_password", // In a real app, this would be hashed
      isAdmin: true,
      name: "Admin User",
      email: "admin@quickbite.com"
    });
    
    // Seed with some menu items
    this.seedMenuItems();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { id, ...insertUser };
    this.users.set(id, user);
    return user;
  }

  // Menu item methods
  async getAllMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );
  }

  async createMenuItem(insertMenuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemIdCounter++;
    const menuItem: MenuItem = { id, ...insertMenuItem, rating: 0 };
    this.menuItems.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, insertMenuItem: InsertMenuItem): Promise<MenuItem | undefined> {
    const existingMenuItem = this.menuItems.get(id);
    if (!existingMenuItem) return undefined;
    
    const updatedMenuItem: MenuItem = {
      ...existingMenuItem,
      ...insertMenuItem
    };
    
    this.menuItems.set(id, updatedMenuItem);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      (item) => item.userId === userId
    );
  }

  async getCartItemsWithDetails(userId: number): Promise<CartItemWithDetails[]> {
    const cartItems = await this.getCartItems(userId);
    return Promise.all(
      cartItems.map(async (item) => {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        return {
          ...item,
          menuItem: menuItem!
        };
      })
    );
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if this item is already in the cart
    const existingCartItem = Array.from(this.cartItems.values()).find(
      (item) => item.userId === insertCartItem.userId && item.menuItemId === insertCartItem.menuItemId
    );
    
    if (existingCartItem) {
      // Increment quantity of existing item
      return this.updateCartItemQuantity(
        existingCartItem.id, 
        insertCartItem.userId, 
        existingCartItem.quantity + insertCartItem.quantity
      ) as Promise<CartItem>;
    }
    
    // Otherwise, add as a new item
    const id = this.cartItemIdCounter++;
    const cartItem: CartItem = { id, ...insertCartItem };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async removeFromCart(id: number, userId: number): Promise<boolean> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem || cartItem.userId !== userId) return false;
    return this.cartItems.delete(id);
  }

  async updateCartItemQuantity(id: number, userId: number, quantity: number): Promise<CartItem | undefined> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem || cartItem.userId !== userId) return undefined;
    
    const updatedCartItem: CartItem = {
      ...cartItem,
      quantity
    };
    
    this.cartItems.set(id, updatedCartItem);
    return updatedCartItem;
  }

  async clearCart(userId: number): Promise<boolean> {
    const cartItems = await this.getCartItems(userId);
    for (const item of cartItems) {
      this.cartItems.delete(item.id);
    }
    return true;
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const now = new Date();
    const order: Order = { 
      id, 
      ...insertOrder, 
      createdAt: now,
      status: 'pending'
    };
    
    this.orders.set(id, order);
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUserId(userId: number): Promise<OrderWithItems[]> {
    const userOrders = Array.from(this.orders.values()).filter(
      (order) => order.userId === userId
    );
    
    // Convert to OrderWithItems
    return Promise.all(
      userOrders.map(async (order) => {
        const itemsWithDetails = await Promise.all(
          (order.items as any[]).map(async (item) => {
            const menuItem = await this.getMenuItemById(item.menuItemId);
            return {
              menuItem: menuItem!,
              quantity: item.quantity
            };
          })
        );
        
        return {
          ...order,
          items: itemsWithDetails
        };
      })
    );
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder: Order = {
      ...order,
      status
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Seed method for demo menu items
  private async seedMenuItems() {
    const menuItemsData: InsertMenuItem[] = [
      {
        name: "Pepperoni Pizza",
        description: "Classic pepperoni pizza with mozzarella and our special sauce",
        price: 12.99,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Pizza",
        isPopular: true
      },
      {
        name: "Deluxe Burger",
        description: "Juicy beef patty with cheese, lettuce, tomato and special sauce",
        price: 10.99,
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Burgers",
        isPopular: true
      },
      {
        name: "Salmon Sushi Roll",
        description: "Fresh salmon, avocado, cucumber wrapped in seaweed and rice",
        price: 14.99,
        imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Sushi",
        isPopular: true
      },
      {
        name: "Pasta Carbonara",
        description: "Creamy pasta with bacon, egg, parmesan cheese and black pepper",
        price: 13.99,
        imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Pasta",
        isPopular: true
      },
      {
        name: "Margherita Pizza",
        description: "Classic pizza with tomato sauce, mozzarella cheese, and fresh basil",
        price: 11.99,
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Pizza",
        isPopular: false
      },
      {
        name: "Chicken Salad",
        description: "Fresh vegetables with grilled chicken, avocado and vinaigrette",
        price: 9.99,
        imageUrl: "https://images.unsplash.com/photo-1532465614-6cc8d45f647f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Salads",
        isPopular: false
      },
      {
        name: "Spicy Wings",
        description: "Crispy chicken wings tossed in our special hot sauce",
        price: 8.99,
        imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Chicken",
        isPopular: false
      },
      {
        name: "Chocolate Cake",
        description: "Rich chocolate cake with ganache frosting and berries",
        price: 6.99,
        imageUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        category: "Desserts",
        isPopular: false
      }
    ];
    
    for (const item of menuItemsData) {
      await this.createMenuItem(item);
    }
  }
}

// Import MongoDB storage
import { MongoStorage } from './mongo-storage';

// Choose which storage implementation to use
// export const storage = new MemStorage(); // In-memory storage
export const storage = new MongoStorage(); // MongoDB storage
