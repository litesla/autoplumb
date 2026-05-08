import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Product {
  id: string | number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  stock: number;
  type: 'auto' | 'plumbing';
  brand?: string;
  article?: string;
  specs?: string;
  rating?: number;
  reviewCount?: number;
}

export interface OrderItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string | number;
  items: OrderItem[];
  total_price: number;
  phone: string;
  delivery_address: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  user_id?: string;
}
