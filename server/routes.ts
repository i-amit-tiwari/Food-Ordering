import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import Stripe from "stripe";
import { 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertCartItemSchema,
  OrderStatus
} from "@shared/schema";
import dotenv from 'dotenv';
dotenv.config();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY environment variable is not set");
}
const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2023-10-16" as any, // Type assertion to avoid version mismatch error
});

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Type guard to check if user exists and has required properties
function ensureUser(req: Request): req is Request & { user: Express.User } {
  return req.isAuthenticated() && !!req.user;
}

// Admin authorization middleware
function isAdmin(req: Request, res: Response, next: Function) {
  if (ensureUser(req) && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Menu routes
  app.get("/api/menu", async (req, res) => {
    try {
      const menuItems = await storage.getAllMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching menu items" });
    }
  });

  app.post("/api/menu", isAdmin, async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating menu item" });
      }
    }
  });

  app.put("/api/menu/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.updateMenuItem(id, validatedData);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating menu item" });
      }
    }
  });

  app.delete("/api/menu/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMenuItem(id);
      if (!success) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting menu item" });
    }
  });

  // Cart routes
  app.get("/api/cart", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const cartItems = await storage.getCartItemsWithDetails(req.user.id);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cart items" });
    }
  });

  app.post("/api/cart", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = insertCartItemSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const cartItem = await storage.addToCart(validatedData);
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error adding item to cart" });
      }
    }
  });

  app.delete("/api/cart/:id", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeFromCart(id, req.user.id);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing item from cart" });
    }
  });

  app.put("/api/cart/:id", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      
      const cartItem = await storage.updateCartItemQuantity(id, req.user.id, quantity);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating cart item" });
    }
  });

  // Order routes
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const validatedData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const order = await storage.createOrder(validatedData);
      
      // Clear the user's cart after successful order
      await storage.clearCart(req.user.id);
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating order" });
      }
    }
  });

  app.get("/api/orders/:userId", isAuthenticated, async (req, res) => {
    if (!ensureUser(req)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own orders unless they are admins
      if (userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/orders", isAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching all orders" });
    }
  });

  app.patch("/api/orders/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'processing', 'delivering', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
      }
      
      const order = await storage.updateOrderStatus(id, status as OrderStatus);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  });

  // Payment route (Stripe integration)
  app.post("/api/payment", isAuthenticated, async (req, res) => {
    console.log("Payment API called with body:", req.body);
    
    if (!ensureUser(req)) {
      console.log("User not authenticated in payment endpoint");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        console.log("Invalid amount in payment request:", amount);
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      console.log(`Creating payment intent for user ${req.user.id} with amount ${amount}`);
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.id.toString(),
        },
      });
      
      console.log("Payment intent created successfully:", paymentIntent.id);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
