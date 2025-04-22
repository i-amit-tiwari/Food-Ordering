import { 
  User, 
  MenuItem, 
  CartItem, 
  Order, 
  UserDocument,
  MenuItemDocument,
  CartItemDocument,
  OrderDocument
} from './mongo-db';
import { IStorage } from './storage';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';

// Import types from shared schema
import {
  InsertUser,
  InsertMenuItem,
  InsertCartItem,
  InsertOrder,
  User as UserType,
  MenuItem as MenuItemType,
  CartItem as CartItemType,
  Order as OrderType,
  CartItemWithDetails,
  OrderWithItems,
  OrderStatus
} from '@shared/schema';

const MemoryStore = createMemoryStore(session);

// Utility functions to convert between MongoDB documents and our application types
// Helper function to convert MongoDB ObjectId to a numeric ID
function objectIdToNumericId(objectId: any): number {
  if (!objectId) return 0;
  const idStr = objectId.toString();
  // Take the last 6 characters of the ObjectId and convert to a number
  return parseInt(idStr.substring(idStr.length - 6), 16);
}

function convertUserDocToType(doc: UserDocument): UserType {
  return {
    id: objectIdToNumericId(doc._id),
    username: doc.username,
    password: doc.password,
    name: doc.name,
    email: doc.email,
    isAdmin: doc.isAdmin
  };
}

function convertMenuItemDocToType(doc: MenuItemDocument): MenuItemType {
  return {
    id: objectIdToNumericId(doc._id),
    name: doc.name,
    description: doc.description,
    price: doc.price,
    imageUrl: doc.imageUrl,
    category: doc.category,
    rating: doc.rating,
    isPopular: doc.isPopular
  };
}

function convertCartItemDocToType(doc: CartItemDocument): CartItemType {
  return {
    id: objectIdToNumericId(doc._id),
    userId: objectIdToNumericId(doc.userId),
    menuItemId: objectIdToNumericId(doc.menuItemId),
    quantity: doc.quantity
  };
}

function convertOrderDocToType(doc: OrderDocument): OrderType {
  return {
    id: objectIdToNumericId(doc._id),
    userId: objectIdToNumericId(doc.userId),
    items: doc.items,
    status: doc.status,
    total: doc.total,
    address: doc.address,
    paymentId: doc.paymentId,
    createdAt: doc.createdAt
  };
}

// MongoDB Storage implementation
export class MongoStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User methods
  async getUser(id: number | string): Promise<UserType | undefined> {
    try {
      console.log("MongoStorage getUser called with ID:", id, "Type:", typeof id);
      
      // Try different strategies to locate the user
      let user;
      
      // 1. If it's a string and looks like a MongoDB ObjectId
      if (typeof id === 'string' && id.length === 24) {
        console.log("Looking up user by full MongoDB ObjectId:", id);
        user = await User.findById(id);
      }
      
      // 2. If it's a number, try the hex conversion approach
      if (!user && typeof id === 'number') {
        const stringId = id.toString(16).padStart(24, '0');
        console.log("Looking up user by padded hex ID:", stringId);
        user = await User.findById(stringId);
      }
      
      // 3. If still not found, try looking up all users and find a matching numeric ID
      if (!user) {
        console.log("Trying to match user by numeric ID portion");
        const allUsers = await User.find();
        for (const potentialUser of allUsers) {
          const numericId = objectIdToNumericId(potentialUser._id);
          console.log("Checking user:", potentialUser.username, "with numeric ID:", numericId, "against target:", id);
          if (numericId === Number(id)) {
            user = potentialUser;
            break;
          }
        }
      }
      
      return user ? convertUserDocToType(user) : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ username });
      return user ? convertUserDocToType(user) : undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<UserType> {
    try {
      const newUser = new User(insertUser);
      const savedUser = await newUser.save();
      return convertUserDocToType(savedUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Menu item methods
  async getAllMenuItems(): Promise<MenuItemType[]> {
    try {
      const menuItems = await MenuItem.find();
      return menuItems.map(convertMenuItemDocToType);
    } catch (error) {
      console.error('Error getting all menu items:', error);
      return [];
    }
  }

  async getMenuItemById(id: number): Promise<MenuItemType | undefined> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const menuItem = await MenuItem.findById(stringId);
      return menuItem ? convertMenuItemDocToType(menuItem) : undefined;
    } catch (error) {
      console.error('Error getting menu item by id:', error);
      return undefined;
    }
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItemType[]> {
    try {
      const menuItems = await MenuItem.find({ category });
      return menuItems.map(convertMenuItemDocToType);
    } catch (error) {
      console.error('Error getting menu items by category:', error);
      return [];
    }
  }

  async createMenuItem(insertMenuItem: InsertMenuItem): Promise<MenuItemType> {
    try {
      const newMenuItem = new MenuItem(insertMenuItem);
      const savedMenuItem = await newMenuItem.save();
      return convertMenuItemDocToType(savedMenuItem);
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  async updateMenuItem(id: number, insertMenuItem: InsertMenuItem): Promise<MenuItemType | undefined> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const updatedMenuItem = await MenuItem.findByIdAndUpdate(
        stringId,
        insertMenuItem,
        { new: true }
      );
      return updatedMenuItem ? convertMenuItemDocToType(updatedMenuItem) : undefined;
    } catch (error) {
      console.error('Error updating menu item:', error);
      return undefined;
    }
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const result = await MenuItem.findByIdAndDelete(stringId);
      return !!result;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return false;
    }
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItemType[]> {
    try {
      console.log("Getting cart items for user ID:", userId);
      
      // Try different ID formats to find cart items
      let cartItems = [];
      
      // First try the padded hex ID approach
      const stringUserId = userId.toString(16).padStart(24, '0');
      console.log("Looking for cart items with string userId:", stringUserId);
      cartItems = await CartItem.find({ userId: stringUserId });
      console.log("Found cart items with hex userId:", cartItems.length);
      
      // If no items found, try looking for cart items by numeric userId directly
      if (cartItems.length === 0) {
        console.log("Trying numeric userId directly:", userId);
        cartItems = await CartItem.find({ userId: userId });
        console.log("Found cart items with numeric userId:", cartItems.length);
      }
      
      // Last resort: find all cart items and log for debugging
      if (cartItems.length === 0) {
        console.log("No cart items found with any userId format, looking at all cart items for debugging");
        const allCartItems = await CartItem.find();
        console.log("Total cart items in database:", allCartItems.length);
        
        if (allCartItems.length > 0) {
          console.log("Sample cart item:", JSON.stringify(allCartItems[0]));
        }
      }
      
      const result = cartItems.map(convertCartItemDocToType);
      console.log("Converted cart items:", result.length);
      return result;
    } catch (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
  }

  async getCartItemsWithDetails(userId: number): Promise<CartItemWithDetails[]> {
    try {
      console.log("Getting cart items with details for user ID:", userId);
      
      // Try to find the user in MongoDB
      let user;
      
      // First by numeric ID
      const allUsers = await User.find();
      for (const potentialUser of allUsers) {
        const numericId = objectIdToNumericId(potentialUser._id);
        if (numericId === userId) {
          user = potentialUser;
          break;
        }
      }
      
      if (!user) {
        console.log("No user found with ID:", userId);
        return [];
      }
      
      console.log("Found user:", user.username, "with ID:", user._id);
      
      // Now get the cart items for this user's MongoDB _id
      const cartItems = await CartItem.find({ userId: user._id }).populate('menuItemId');
      console.log("Found cart items:", cartItems.length);
      
      const result: CartItemWithDetails[] = [];
      
      for (const item of cartItems) {
        // Convert the cart item directly in this method
        const cartItemDoc = convertCartItemDocToType(item);
        
        // Use the populated menuItem directly or get it separately
        let menuItem;
        if (item.menuItemId && typeof item.menuItemId !== 'string') {
          // If menuItemId is the populated document
          menuItem = convertMenuItemDocToType(item.menuItemId);
        } else {
          // Get the menu item by ID
          menuItem = await this.getMenuItemById(cartItemDoc.menuItemId);
        }
        
        if (menuItem) {
          result.push({
            ...cartItemDoc,
            menuItem
          });
        }
      }
      
      console.log("Returning cart items with details:", result.length);
      return result;
    } catch (error) {
      console.error('Error getting cart items with details:', error);
      return [];
    }
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItemType> {
    try {
      console.log("Adding to cart:", insertCartItem);
      
      // Find the corresponding User and MenuItem objects in MongoDB
      // Find user by numeric ID
      let user = null;
      const allUsers = await User.find();
      for (const potentialUser of allUsers) {
        const numericId = objectIdToNumericId(potentialUser._id);
        if (numericId === insertCartItem.userId) {
          user = potentialUser;
          break;
        }
      }
      
      if (!user) {
        throw new Error(`User not found with ID: ${insertCartItem.userId}`);
      }
      
      // Find the menu item by its numeric ID
      let menuItem = null;
      const allMenuItems = await MenuItem.find();
      for (const item of allMenuItems) {
        const numericId = objectIdToNumericId(item._id);
        if (numericId === insertCartItem.menuItemId) {
          menuItem = item;
          break;
        }
      }
      
      if (!menuItem) {
        throw new Error(`Menu item not found with ID: ${insertCartItem.menuItemId}`);
      }
      
      console.log("Found user:", user.username, "with ID:", user._id);
      console.log("Found menu item:", menuItem.name, "with ID:", menuItem._id);
      
      // Check if this item is already in the cart
      const existingCartItem = await CartItem.findOne({
        userId: user._id,
        menuItemId: menuItem._id
      });
      
      if (existingCartItem) {
        console.log("Item already in cart, updating quantity");
        // Increment quantity of existing item
        const updatedCartItem = await CartItem.findByIdAndUpdate(
          existingCartItem._id,
          { quantity: existingCartItem.quantity + (insertCartItem.quantity || 1) },
          { new: true }
        );
        return convertCartItemDocToType(updatedCartItem);
      }
      
      // Otherwise, add as a new item
      console.log("Adding new item to cart");
      const cartItemData = {
        userId: user._id,
        menuItemId: menuItem._id,
        quantity: insertCartItem.quantity || 1
      };
      
      const newCartItem = new CartItem(cartItemData);
      const savedCartItem = await newCartItem.save();
      console.log("New cart item saved:", savedCartItem);
      
      return convertCartItemDocToType(savedCartItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async removeFromCart(id: number, userId: number): Promise<boolean> {
    try {
      // Find user by numeric ID
      let user = null;
      const allUsers = await User.find();
      for (const potentialUser of allUsers) {
        const numericId = objectIdToNumericId(potentialUser._id);
        if (numericId === userId) {
          user = potentialUser;
          break;
        }
      }
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Find the cart item by numeric ID
      const allCartItems = await CartItem.find({ userId: user._id });
      for (const item of allCartItems) {
        const numericId = objectIdToNumericId(item._id);
        if (numericId === id) {
          await CartItem.findByIdAndDelete(item._id);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  async updateCartItemQuantity(id: number, userId: number, quantity: number): Promise<CartItemType | undefined> {
    try {
      // Find user by numeric ID
      let user = null;
      const allUsers = await User.find();
      for (const potentialUser of allUsers) {
        const numericId = objectIdToNumericId(potentialUser._id);
        if (numericId === userId) {
          user = potentialUser;
          break;
        }
      }
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Find the target cart item
      const cartItems = await CartItem.find({ userId: user._id }).populate('menuItemId');
      console.log("Found cart items for user:", cartItems.length);
      
      let targetCartItem = null;
      for (const item of cartItems) {
        const itemId = objectIdToNumericId(item._id);
        console.log("Comparing cart item ID:", itemId, "with target ID:", id);
        if (itemId === id) {
          targetCartItem = item;
          break;
        }
      }
      
      if (!targetCartItem) {
        console.log("Cart item not found with ID:", id);
        return undefined;
      }
      
      console.log("Updating cart item:", targetCartItem._id, "with quantity:", quantity);
      const updatedCartItem = await CartItem.findByIdAndUpdate(
        targetCartItem._id,
        { quantity },
        { new: true }
      );
      
      return updatedCartItem ? convertCartItemDocToType(updatedCartItem) : undefined;
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      return undefined;
    }
  }

  async clearCart(userId: number): Promise<boolean> {
    try {
      // Find user by numeric ID
      let user = null;
      const allUsers = await User.find();
      for (const potentialUser of allUsers) {
        const numericId = objectIdToNumericId(potentialUser._id);
        if (numericId === userId) {
          user = potentialUser;
          break;
        }
      }
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      await CartItem.deleteMany({ userId: user._id });
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<OrderType> {
    try {
      // Convert numeric userId to string ID for MongoDB
      const stringUserId = insertOrder.userId.toString(16).padStart(24, '0');
      
      // Convert items to use string IDs for menuItemId
      const items = insertOrder.items.map((item: any) => ({
        menuItemId: item.menuItemId.toString(16).padStart(24, '0'),
        quantity: item.quantity
      }));
      
      const orderData = {
        userId: stringUserId,
        items,
        total: insertOrder.total,
        address: insertOrder.address,
        paymentId: insertOrder.paymentId,
        status: 'pending'
      };
      
      const newOrder = new Order(orderData);
      const savedOrder = await newOrder.save();
      return convertOrderDocToType(savedOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrderById(id: number): Promise<OrderType | undefined> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const order = await Order.findById(stringId);
      return order ? convertOrderDocToType(order) : undefined;
    } catch (error) {
      console.error('Error getting order by id:', error);
      return undefined;
    }
  }

  async getOrdersByUserId(userId: number): Promise<OrderWithItems[]> {
    try {
      const stringUserId = userId.toString(16).padStart(24, '0');
      const orders = await Order.find({ userId: stringUserId }).sort({ createdAt: -1 });
      
      const result: OrderWithItems[] = [];
      for (const order of orders) {
        const itemsWithDetails = [];
        
        for (const item of order.items) {
          // Handle both string and ObjectId menuItemId
          const menuItemId = item.menuItemId.toString();
          const numericMenuItemId = parseInt(menuItemId.substring(menuItemId.length - 6), 16);
          const menuItem = await this.getMenuItemById(numericMenuItemId);
          
          if (menuItem) {
            itemsWithDetails.push({
              menuItem,
              quantity: item.quantity
            });
          }
        }
        
        result.push({
          ...convertOrderDocToType(order),
          items: itemsWithDetails
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting orders by user id:', error);
      return [];
    }
  }

  async getAllOrders(): Promise<OrderType[]> {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      return orders.map(convertOrderDocToType);
    } catch (error) {
      console.error('Error getting all orders:', error);
      return [];
    }
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<OrderType | undefined> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const updatedOrder = await Order.findByIdAndUpdate(
        stringId,
        { status },
        { new: true }
      );
      return updatedOrder ? convertOrderDocToType(updatedOrder) : undefined;
    } catch (error) {
      console.error('Error updating order status:', error);
      return undefined;
    }
  }

  // Seed initial data
  async seedInitialData() {
    try {
      // Check if we already have menu items
      const menuCount = await MenuItem.countDocuments();
      
      if (menuCount === 0) {
        console.log('Seeding initial data...');
        
        // Create admin user
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
          await User.create({
            username: 'admin',
            password: 'admin_password', // In a real app, this would be hashed
            isAdmin: true,
            name: 'Admin User',
            email: 'admin@quickbite.com'
          });
          console.log('Admin user created');
        }
        
        // Seed menu items
        const menuItemsData = [
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
        
        await MenuItem.insertMany(menuItemsData);
        console.log('Menu items created');
      }
    } catch (error) {
      console.error('Error seeding initial data:', error);
    }
  }
}