import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MenuItem } from "@shared/schema";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CartSidebar } from "@/components/cart/cart-sidebar";
import { MenuSection } from "@/components/menu/menu-section";
import { CategoryFilter } from "@/components/ui/category-filter";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });
  
  // Extract unique categories from menu items
  const categories = Array.from(
    new Set(menuItems.map((item) => item.category))
  ).map((category) => ({
    id: category,
    name: category,
  }));
  
  // Filter menu items by selected category
  const filteredItems = selectedCategory === "all"
    ? menuItems
    : menuItems.filter((item) => item.category === selectedCategory);
  
  // Filter popular items
  const popularItems = menuItems.filter((item) => item.isPopular);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-primary">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:py-12 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Delicious Food</span>
            <span className="block">Delivered To Your Door</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-white text-opacity-90 text-lg">
            Browse our menu and get your favorite meals delivered fast and fresh.
          </p>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="bg-white py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            
            {/* Sort dropdown could be added here */}
          </div>
        </div>
      </div>
      
      {/* Menu Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {selectedCategory === "all" && popularItems.length > 0 && (
                <MenuSection title="Popular Items" items={popularItems} />
              )}
              
              <MenuSection 
                title={selectedCategory === "all" ? "All Items" : selectedCategory} 
                items={filteredItems}
              />
            </>
          )}
        </div>
      </main>
      
      <Footer />
      <CartSidebar />
    </div>
  );
}
