/*
  # Create document_events table for event tracking

  1. New Tables
    - document_events
      - id (uuid, primary key)
      - document_id (uuid, references documents)
      - view_id (uuid, references document_views)
      - event_type (text)
      - event_data (jsonb)
      - created_at (timestamp)

  2. Security
    - Enable RLS
    - Add policies for document owners
    - Add policies for event creation
*/

-- Create document_events table
CREATE TABLE IF NOT EXISTS document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents NOT NULL,
  view_id uuid REFERENCES document_views NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;

-- Policies for document_events
CREATE POLICY "Document owners can view events"
  ON document_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_events.document_id
    AND documents.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can create events"
  ON document_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add index for better query performance
CREATE INDEX idx_document_events_document_id ON document_events(document_id);
CREATE INDEX idx_document_events_view_id ON document_events(view_id);