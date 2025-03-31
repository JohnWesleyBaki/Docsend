/*
  # Add updated_at column to document_views table

  1. Changes
    - Add updated_at column to document_views table
    - Set default value to now()
    - Allow null values for backward compatibility
*/

ALTER TABLE document_views
ADD COLUMN updated_at timestamptz DEFAULT now();