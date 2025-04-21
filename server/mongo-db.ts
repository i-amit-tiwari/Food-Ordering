import mongoose from 'mongoose';

// Set the environment variable for your MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-ordering-app';

// Connect to MongoDB
export const connectToDatabase = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// MongoDB Models
// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  isAdmin: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

// Menu Item Model
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  category: { type: String, required: true },
  rating: { type: Number, default: 0 },
  isPopular: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Cart Item Model
const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, default: 1 }
}, {
  timestamps: true
});

// Order Model
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true, default: 1 }
    }
  ],
  status: { 
    type: String, 
    required: true, 
    default: 'pending',
    enum: ['pending', 'processing', 'delivering', 'delivered', 'cancelled']
  },
  total: { type: Number, required: true },
  address: { type: String },
  paymentId: { type: String }
}, {
  timestamps: true
});

// Create models
export const User = mongoose.model('User', userSchema);
export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export const CartItem = mongoose.model('CartItem', cartItemSchema);
export const Order = mongoose.model('Order', orderSchema);

// Export types
export type UserDocument = mongoose.Document & {
  id: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
};

export type MenuItemDocument = mongoose.Document & {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  rating: number;
  isPopular: boolean;
};

export type CartItemDocument = mongoose.Document & {
  id: string;
  userId: string;
  menuItemId: string;
  quantity: number;
};

export type OrderDocument = mongoose.Document & {
  id: string;
  userId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  status: 'pending' | 'processing' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  address?: string;
  paymentId?: string;
  createdAt: Date;
};