import React, { createContext, useContext, useState, useEffect } from 'react';

type ShopMode = 'auto' | 'plumbing';

interface ShopContextType {
  mode: ShopMode;
  setMode: (mode: ShopMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  selectedBrands: string[];
  setSelectedBrands: (brands: string[]) => void;
  resetFilters: () => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ShopMode>(() => {
    const saved = localStorage.getItem('shopMode');
    return (saved as ShopMode) || 'auto';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('shopMode', mode);
  }, [mode]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPriceRange([0, 50000]);
    setSelectedBrands([]);
  };

  return (
    <ShopContext.Provider value={{ 
      mode, 
      setMode, 
      searchQuery, 
      setSearchQuery, 
      selectedCategory, 
      setSelectedCategory,
      priceRange,
      setPriceRange,
      selectedBrands,
      setSelectedBrands,
      resetFilters
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within ShopProvider');
  return context;
};
