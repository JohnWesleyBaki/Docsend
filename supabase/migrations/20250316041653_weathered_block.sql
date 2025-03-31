/*
  # Initial Schema Setup for DocSend Clone

  1. New Tables
    - documents
      - id (uuid, primary key)
      - title (text)
      - owner_id (uuid, references auth.users)
      - file_path (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - document_views
      - id (uuid, primary key)
      - document_id (uuid, references documents)
      - viewer_ip (text)
      - total_time (integer)
      - page_times (jsonb)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for document owners
    - Add policies for document viewers
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document_views table
CREATE TABLE IF NOT EXISTS document_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents NOT NULL,
  viewer_ip text NOT NULL,
  total_time integer DEFAULT 0,
  page_times jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;

-- Policies for documents
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Policies for document_views
CREATE POLICY "Document owners can view analytics"
  ON document_views
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_views.document_id
    AND documents.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can create document views"
  ON document_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own view session"
  ON document_views
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);