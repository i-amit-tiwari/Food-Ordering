import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  className?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  className
}: CategoryFilterProps) {
  return (
    <div className={cn("py-4 overflow-x-auto", className)}>
      <div className="flex space-x-2 pb-2">
        <button
          onClick={() => onSelectCategory("all")}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
            selectedCategory === "all"
              ? "bg-primary text-white"
              : "text-neutral-700 hover:bg-neutral-100"
          )}
        >
          All
        </button>
        
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              selectedCategory === category.id
                ? "bg-primary text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
