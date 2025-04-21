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
function convertUserDocToType(doc: UserDocument): UserType {
  return {
    id: Number(doc._id.toString().substring(doc._id.toString().length - 6), 16),
    username: doc.username,
    password: doc.password,
    name: doc.name,
    email: doc.email,
    isAdmin: doc.isAdmin
  };
}

function convertMenuItemDocToType(doc: MenuItemDocument): MenuItemType {
  return {
    id: Number(doc._id.toString().substring(doc._id.toString().length - 6), 16),
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
    id: Number(doc._id.toString().substring(doc._id.toString().length - 6), 16),
    userId: Number(doc.userId.toString().substring(doc.userId.toString().length - 6), 16),
    menuItemId: Number(doc.menuItemId.toString().substring(doc.menuItemId.toString().length - 6), 16),
    quantity: doc.quantity
  };
}

function convertOrderDocToType(doc: OrderDocument): OrderType {
  return {
    id: Number(doc._id.toString().substring(doc._id.toString().length - 6), 16),
    userId: Number(doc.userId.toString().substring(doc.userId.toString().length - 6), 16),
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
  async getUser(id: number): Promise<UserType | undefined> {
    try {
      // Convert numeric ID to string ID format for MongoDB lookup
      const stringId = id.toString(16).padStart(24, '0');
      const user = await User.findById(stringId);
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
      const stringUserId = userId.toString(16).padStart(24, '0');
      const cartItems = await CartItem.find({ userId: stringUserId });
      return cartItems.map(convertCartItemDocToType);
    } catch (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
  }

  async getCartItemsWithDetails(userId: number): Promise<CartItemWithDetails[]> {
    try {
      const cartItems = await this.getCartItems(userId);
      
      const result: CartItemWithDetails[] = [];
      for (const item of cartItems) {
        const menuItem = await this.getMenuItemById(item.menuItemId);
        if (menuItem) {
          result.push({
            ...item,
            menuItem
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting cart items with details:', error);
      return [];
    }
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItemType> {
    try {
      // Convert numeric user and menu item IDs to string IDs for MongoDB
      const stringUserId = insertCartItem.userId.toString(16).padStart(24, '0');
      const stringMenuItemId = insertCartItem.menuItemId.toString(16).padStart(24, '0');
      
      // Check if this item is already in the cart
      const existingCartItem = await CartItem.findOne({
        userId: stringUserId,
        menuItemId: stringMenuItemId
      });
      
      if (existingCartItem) {
        // Increment quantity of existing item
        const updatedCartItem = await CartItem.findByIdAndUpdate(
          existingCartItem._id,
          { quantity: existingCartItem.quantity + insertCartItem.quantity },
          { new: true }
        );
        return convertCartItemDocToType(updatedCartItem);
      }
      
      // Otherwise, add as a new item
      const cartItemData = {
        userId: stringUserId,
        menuItemId: stringMenuItemId,
        quantity: insertCartItem.quantity
      };
      
      const newCartItem = new CartItem(cartItemData);
      const savedCartItem = await newCartItem.save();
      return convertCartItemDocToType(savedCartItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async removeFromCart(id: number, userId: number): Promise<boolean> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const stringUserId = userId.toString(16).padStart(24, '0');
      
      const result = await CartItem.findOneAndDelete({
        _id: stringId,
        userId: stringUserId
      });
      
      return !!result;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  async updateCartItemQuantity(id: number, userId: number, quantity: number): Promise<CartItemType | undefined> {
    try {
      const stringId = id.toString(16).padStart(24, '0');
      const stringUserId = userId.toString(16).padStart(24, '0');
      
      const updatedCartItem = await CartItem.findOneAndUpdate(
        { _id: stringId, userId: stringUserId },
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
      const stringUserId = userId.toString(16).padStart(24, '0');
      await CartItem.deleteMany({ userId: stringUserId });
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
          // Convert the MongoDB string ID to numeric ID for our application
          const numericMenuItemId = Number((item.menuItemId as unknown as string).substring((item.menuItemId as unknown as string).length - 6), 16);
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