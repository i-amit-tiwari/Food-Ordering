import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/context/cart-context";
import { 
  Search,
  ShoppingCart,
  Menu,
  User as UserIcon,
  LogOut
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  const { items, toggleCart } = useCart();
  
  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-primary font-bold text-xl cursor-pointer">QuickBite</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <a className="border-primary text-neutral-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Menu
                </a>
              </Link>
              <Link href="/orders">
                <a className="border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Orders
                </a>
              </Link>
              {user?.isAdmin && (
                <Link href="/admin/menu">
                  <a className="border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-800 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Admin
                  </a>
                </Link>
              )}
            </div>
          </div>
          
          {/* Desktop Search, Cart and User controls */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative mr-4">
              <Input
                type="text"
                placeholder="Search menu..."
                className="w-64 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-500" />
            </div>
            
            <button
              onClick={toggleCart}
              className="p-2 text-neutral-600 hover:text-neutral-900 relative mr-3"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center text-sm font-medium text-neutral-700 hover:text-neutral-900 focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name || user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/orders">
                    <DropdownMenuItem className="cursor-pointer">
                      My Orders
                    </DropdownMenuItem>
                  </Link>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <Link href="/admin/menu">
                        <DropdownMenuItem className="cursor-pointer">
                          Manage Menu
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/orders">
                        <DropdownMenuItem className="cursor-pointer">
                          Manage Orders
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 cursor-pointer"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <a className="text-primary font-medium hover:text-primary/80">Login</a>
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            {user && (
              <button
                onClick={toggleCart}
                className="p-2 text-neutral-600 hover:text-neutral-900 relative mr-2"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            )}
            
            <Sheet>
              <SheetTrigger asChild>
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center p-2 rounded-md text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:outline-none"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col h-full">
                  <div className="pt-4 pb-3 border-b border-neutral-200">
                    {user ? (
                      <div className="flex items-center px-4">
                        <div className="flex-shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-neutral-800">{user.name || user.username}</div>
                          {user.email && (
                            <div className="text-sm font-medium text-neutral-500">{user.email}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4">
                        <Link href="/auth">
                          <a className="block text-center w-full py-2 bg-primary text-white rounded-md font-medium">
                            Login / Register
                          </a>
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-2 py-3 space-y-1">
                    <Link href="/">
                      <a className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-100">
                        Menu
                      </a>
                    </Link>
                    
                    {user && (
                      <Link href="/orders">
                        <a className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-100">
                          Orders
                        </a>
                      </Link>
                    )}
                    
                    {user?.isAdmin && (
                      <>
                        <Link href="/admin/menu">
                          <a className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-100">
                            Manage Menu
                          </a>
                        </Link>
                        <Link href="/admin/orders">
                          <a className="block px-3 py-2 rounded-md text-base font-medium text-neutral-700 hover:bg-neutral-100">
                            Manage Orders
                          </a>
                        </Link>
                      </>
                    )}
                  </div>
                  
                  {user && (
                    <div className="mt-auto border-t border-neutral-200 pt-4 pb-3">
                      <button
                        onClick={() => logoutMutation.mutate()}
                        className="flex items-center px-4 py-2 text-base font-medium text-red-500 hover:bg-red-50 hover:text-red-700 w-full"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
