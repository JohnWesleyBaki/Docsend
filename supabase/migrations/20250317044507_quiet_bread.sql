/*
  # Update document_views table for location and device tracking

  1. Changes
    - Remove viewer_ip column
    - Add location and device_info columns
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Ensure public access for document viewing
*/

-- Remove viewer_ip column and add new columns
ALTER TABLE document_views
DROP COLUMN viewer_ip,
ADD COLUMN location jsonb DEFAULT '{}',
ADD COLUMN device_info jsonb DEFAULT '{}';

-- Update or create policies for public document access
CREATE POLICY "Anyone can view public documents"
  ON documents
  FOR SELECT
  USING (true);

-- Ensure storage policies allow public read access
CREATE POLICY "Public can read document files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');

-- Update existing policies
DROP POLICY IF EXISTS "Document owners can view analytics" ON document_views;
CREATE POLICY "Document owners can view analytics"
  ON document_views
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_views.document_id
    AND documents.owner_id = auth.uid()
  ));

-- Add index for better query performance
CREATE INDEX idx_document_views_document_id ON document_views(document_id);