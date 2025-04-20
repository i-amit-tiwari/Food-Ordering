import { MenuItemCard } from "@/components/menu/menu-item-card";
import { MenuItem } from "@shared/schema";

interface MenuSectionProps {
  title: string;
  items: MenuItem[];
}

export function MenuSection({ title, items }: MenuSectionProps) {
  if (items.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
