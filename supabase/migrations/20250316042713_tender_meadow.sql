/*
  # Create storage bucket for documents

  1. New Storage Bucket
    - Creates a new public storage bucket named 'documents'
    - Enables public access for document viewing
  
  2. Security
    - Enables RLS policies for the bucket
    - Adds policy for authenticated users to upload their documents
    - Adds policy for public access to view documents
*/

-- Create the storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true);

-- Enable RLS on the bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to view documents
CREATE POLICY "Anyone can view documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');