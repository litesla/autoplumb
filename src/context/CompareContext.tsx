import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../lib/utils';

interface CompareContextType {
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string | number) => void;
  isInCompare: (productId: string | number) => boolean;
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareList, setCompareList] = useState<Product[]>([]);

  useEffect(() => {
    const savedCompare = localStorage.getItem('compareList');
    if (savedCompare) {
      setCompareList(JSON.parse(savedCompare));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('compareList', JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = (product: Product) => {
    if (compareList.length >= 4) {
      alert('Ви можете порівнювати не більше 4 товарів одночасно.');
      return;
    }
    if (compareList.length > 0 && compareList[0].type !== product.type) {
      alert('Можна порівнювати товари лише одного типу (наприклад, тільки автозапчастини).');
      return;
    }
    setCompareList(prev => [...prev, product]);
  };

  const removeFromCompare = (productId: string | number) => {
    setCompareList(prev => prev.filter(p => p.id !== productId));
  };

  const isInCompare = (productId: string | number) => {
    return compareList.some(p => p.id === productId);
  };

  const toggleCompare = (product: Product) => {
    if (isInCompare(product.id)) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, isInCompare, toggleCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
