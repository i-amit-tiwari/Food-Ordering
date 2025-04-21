import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { User as MongoUser } from "./mongo-db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "quickbite-food-ordering-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    // Convert ObjectId to string if it's a MongoDB document
    const userId = user._id ? user._id.toString() : user.id;
    console.log("Serializing user with ID:", userId);
    done(null, userId);
  });
  
  passport.deserializeUser(async (id: string | number, done) => {
    try {
      console.log("Deserializing user with ID:", id);
      // If the ID is a string (MongoDB ObjectId), we need to find user by MongoDB ID
      if (typeof id === 'string' && id.length === 24) {
        // This is likely a MongoDB ObjectId
        try {
          console.log("Looking up MongoDB user by ID:", id);
          const mongoUser = await MongoUser.findById(id);
          if (mongoUser) {
            console.log("Found MongoDB user:", mongoUser.username);
            // Convert to our application user format using the helper function
            const appUser = {
              id: parseInt(mongoUser._id.toString().substring(mongoUser._id.toString().length - 6), 16),
              username: mongoUser.username,
              password: mongoUser.password,
              name: mongoUser.name || null,
              email: mongoUser.email || null,
              isAdmin: mongoUser.isAdmin
            };
            return done(null, appUser);
          } else {
            console.log("MongoDB user not found");
          }
        } catch (mongoError) {
          console.error('MongoDB lookup error:', mongoError);
        }
      }
      
      // Fall back to regular storage lookup
      console.log("Looking up user in storage with ID:", id);
      const user = await storage.getUser(Number(id));
      console.log("Storage user result:", user ? "found" : "not found");
      done(null, user);
    } catch (error) {
      console.error('User deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
