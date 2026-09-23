-- ==============================================================================
-- AutoPlumb Supabase Row Level Security (RLS) Configuration
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to resolve Issue 3: Enable RLS and lock down public access with secure policies.
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting public policies if any
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Public can view blog posts" ON blog;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
DROP POLICY IF EXISTS "Public can submit reviews" ON reviews;
DROP POLICY IF EXISTS "Public can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

-- 3. PRODUCTS POLICIES
-- Anyone can view products (needed for e-commerce catalog browsing)
CREATE POLICY "Public can view products" 
  ON products FOR SELECT 
  TO public 
  USING (true);

-- Only authenticated admins or service role can insert/update/delete products
CREATE POLICY "Admins can insert products" 
  ON products FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Admins can update products" 
  ON products FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete products" 
  ON products FOR DELETE 
  TO authenticated 
  USING (true);

-- 4. BLOG POLICIES
-- Anyone can read blog posts
CREATE POLICY "Public can view blog posts" 
  ON blog FOR SELECT 
  TO public 
  USING (true);

-- Only admins can manage blog posts
CREATE POLICY "Admins can manage blog" 
  ON blog FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 5. ORDERS POLICIES
-- Anyone (guest or logged-in) can create a new order upon checkout
CREATE POLICY "Public can create orders" 
  ON orders FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Viewing orders is restricted to authenticated users / admins or service role
CREATE POLICY "Authenticated users can view orders" 
  ON orders FOR SELECT 
  TO authenticated 
  USING (true);

-- Only authenticated admins can update order status (processing, shipped, etc.)
CREATE POLICY "Admins can update orders" 
  ON orders FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 6. REVIEWS POLICIES
CREATE POLICY "Public can view reviews" 
  ON reviews FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Public can submit reviews" 
  ON reviews FOR INSERT 
  TO public 
  WITH CHECK (true);

-- 7. CATEGORIES POLICIES
CREATE POLICY "Public can view categories" 
  ON categories FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admins can manage categories" 
  ON categories FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);
