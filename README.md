
# QuickBite - Food Delivery Application

QuickBite is a full-stack food delivery application built with React, Express, and MongoDB. It features a modern UI with dark mode support, user authentication, cart management, and order tracking.

## How to Access This Project

1. Open Replit and create a new repl
2. Click on "Import from GitHub" 
3. Enter the repository URL: `https://github.com/yourusername/quickbite`
4. Once imported, install dependencies:
   ```bash
   npm install
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at the URL shown in your Replit workspace.

## Features

- User authentication (login/register)
- Menu browsing and filtering
- Shopping cart management
- Order placement and tracking
- Dark/Light theme toggle
- Admin dashboard for menu and order management
- Responsive design

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, Radix UI
- Backend: Express.js, MongoDB
- Authentication: JWT
- State Management: React Context
- API Client: TanStack Query

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/      # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Application pages
├── server/                # Backend Express application
│   ├── routes.ts         # API routes
│   ├── auth.ts           # Authentication logic
│   └── storage.ts        # Data storage interface
└── shared/               # Shared TypeScript types
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the application URL

## Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Builds the application for production
- `npm run start` - Runs the production server

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Add new menu item (admin only)
- `PUT /api/menu/:id` - Update menu item (admin only)
- `DELETE /api/menu/:id` - Delete menu item (admin only)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id` - Update order status (admin only)

## User Roles

### Customer
- Browse menu
- Add items to cart
- Place orders
- Track order status
- View order history

### Admin
- Manage menu items
- Update order statuses
- View all orders
- Manage inventory

## Environment Variables

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## Deployment

The application is configured for deployment on Replit. The deployment settings are already configured in the `.replit` file.
