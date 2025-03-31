import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText,  } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DocumentCard from '../components/dashboard/DocumentCard';


interface Document {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  file_path: string;
  shareUrl?: string;
  views?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDocs(documents);
    } else {
      const filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocs(filtered);
    }
  }, [searchTerm, documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      if (!docs || docs.length === 0) {
        setDocuments([]);
        setFilteredDocs([]);
        setLoading(false);
        return;
      }

      const docsWithViews = await Promise.all(docs.map(async (doc) => {
        const { count } = await supabase
          .from('document_views')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id);
          
        return {
          ...doc,
          shareUrl: `${window.location.origin}/view/${doc.id}`,
          views: count || 0
        };
      }));

      setDocuments(docsWithViews);
      setFilteredDocs(docsWithViews);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      toast.error('Failed to load documents. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string, filePath: string) => {
    try {
      // First, delete all related document_events
      const { error: eventsError } = await supabase
        .from('document_events')
        .delete()
        .eq('document_id', id);

      if (eventsError) throw eventsError;

      // Then, delete all related document_views
      const { error: viewsError } = await supabase
        .from('document_views')
        .delete()
        .eq('document_id', id);

      if (viewsError) throw viewsError;

      // Next, delete the document record from the database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Finally, delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update local state
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
      setFilteredDocs(prevDocs => prevDocs.filter(doc => doc.id !== id));

    } catch (err: any) {
      console.error('Error deleting document:', err);
      throw new Error('Failed to delete document. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading document...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          file_path: filePath,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      
      toast.update(toastId, {
        render: 'Document uploaded successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
      
      fetchDocuments();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.update(toastId, {
        render: err.message || 'Failed to upload document',
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in to access your documents</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to upload and manage your documents.</p>
          <Link to="/login" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-gray-600">Manage and track your uploaded documents</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <label className="flex items-center justify-center cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="h-5 w-5 mr-2" />
            <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
          </label>
        </div>
      </div>
      
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              updatedAt={doc.updated_at}
              views={doc.views || 0}
              shareUrl={doc.shareUrl || ''}
              filePath={doc.file_path}
              onDelete={handleDeleteDocument}
              onUpdate={fetchDocuments}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-xl font-medium text-gray-900">No documents found</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {searchTerm ? 'No documents match your search criteria. Try a different search term.' : 'Upload your first document to get started with tracking and analytics.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}