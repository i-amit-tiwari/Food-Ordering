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
  OrderStatus,
  users,
  menuItems,
  cartItems,
  orders
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { IStorage } from "./storage";
import dotenv from 'dotenv';
dotenv.config();

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Menu item methods
  async getAllMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems);
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return menuItem;
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.category, category));
  }

  async createMenuItem(insertMenuItem: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db.insert(menuItems).values(insertMenuItem).returning();
    return menuItem;
  }

  async updateMenuItem(id: number, insertMenuItem: InsertMenuItem): Promise<MenuItem | undefined> {
    const [updatedMenuItem] = await db
      .update(menuItems)
      .set(insertMenuItem)
      .where(eq(menuItems.id, id))
      .returning();
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id));
    return !!result;
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async getCartItemsWithDetails(userId: number): Promise<CartItemWithDetails[]> {
    const userCartItems = await this.getCartItems(userId);
    
    const result: CartItemWithDetails[] = [];
    for (const item of userCartItems) {
      const menuItem = await this.getMenuItemById(item.menuItemId);
      if (menuItem) {
        result.push({
          ...item,
          menuItem
        });
      }
    }
    
    return result;
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if the item is already in the cart
    const [existingCartItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, insertCartItem.userId),
          eq(cartItems.menuItemId, insertCartItem.menuItemId)
        )
      );

    if (existingCartItem) {
      // Update quantity of existing item
      return this.updateCartItemQuantity(
        existingCartItem.id,
        insertCartItem.userId,
        existingCartItem.quantity + insertCartItem.quantity
      ) as Promise<CartItem>;
    }

    // Add new item to cart
    const [cartItem] = await db.insert(cartItems).values(insertCartItem).returning();
    return cartItem;
  }

  async removeFromCart(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, id),
          eq(cartItems.userId, userId)
        )
      );
    return !!result;
  }

  async updateCartItemQuantity(id: number, userId: number, quantity: number): Promise<CartItem | undefined> {
    const [updatedCartItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(
        and(
          eq(cartItems.id, id),
          eq(cartItems.userId, userId)
        )
      )
      .returning();
    return updatedCartItem;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return !!result;
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByUserId(userId: number): Promise<OrderWithItems[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
    
    const result: OrderWithItems[] = [];
    for (const order of userOrders) {
      const itemsWithDetails = [];
      
      // orders.items is a JSONB column containing array of order items
      const orderItems = order.items as any[];
      
      for (const item of orderItems) {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        if (menuItem) {
          itemsWithDetails.push({
            menuItem,
            quantity: item.quantity
          });
        }
      }
      
      result.push({
        ...order,
        items: itemsWithDetails
      });
    }
    
    return result;
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders);
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Seed initial data
  async seedInitialData() {
    // Check if we already have menu items
    const menuCount = await db.select().from(menuItems);
    
    if (menuCount.length === 0) {
      // Seed with default admin user
      await this.createUser({
        username: "admin",
        password: "admin_password", // In a real app, this would be hashed
        isAdmin: true,
        name: "Admin User",
        email: "admin@quickbite.com"
      });
      
      // Seed menu items
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
          imageUrl: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRvRGyIDdiPeQlWwTGJam3ZFtshlf_BxAXuMD8Oz_XXNjFl82_AZoFHLwLBrxWX7eatbznQKgDwKeWgX8P1TKfthIV8Jfeun4ov_sRigP9Jfno57fIIgWVa",
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
}