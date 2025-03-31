/*
  # Fix RLS policies for public access
  
  1. Changes
    - Update RLS policies for document_views to allow public access
    - Update RLS policies for document_events to allow public access
    - Ensure anonymous users can create and update views/events
  
  2. Security
    - Maintain owner-only access for sensitive operations
    - Allow public read access for documents
    - Allow anonymous users to create views and events
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can create document views" ON document_views;
DROP POLICY IF EXISTS "Anyone can update their own view session" ON document_views;
DROP POLICY IF EXISTS "Anyone can create events" ON document_events;

-- Create new policies for document_views
CREATE POLICY "Public can create document views"
  ON document_views
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update document views"
  ON document_views
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read document views"
  ON document_views
  FOR SELECT
  TO public
  USING (true);

-- Create new policies for document_events
CREATE POLICY "Public can create events"
  ON document_events
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can read events"
  ON document_events
  FOR SELECT
  TO public
  USING (true);

-- Ensure documents table has public read access
DROP POLICY IF EXISTS "Anyone can view public documents" ON documents;
CREATE POLICY "Anyone can view public documents"
  ON documents
  FOR SELECT
  TO public
  USING (true);