import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Eye, Link as LinkIcon, Copy, Check, BarChart, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface DocumentCardProps {
  id: string;
  title: string;
  updatedAt: string;
  views: number;
  shareUrl: string;
  filePath: string;
  onDelete: (id: string, filePath: string) => Promise<void>;
  onUpdate: () => void;
}

export default function DocumentCard({ 
  id, 
  title, 
  updatedAt, 
  views, 
  shareUrl, 
  filePath, 
  onDelete,
  onUpdate 
}: DocumentCardProps) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  };

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading document...');

    try {
      // Delete the old file
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Upload the new file with the same path
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (title !== file.name || true) { 
        const { error: updateError } = await supabase
          .from('documents')
          .update({ 
            title: file.name,
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      onUpdate();
      toast.update(toastId, {
        render: 'Document updated successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
    } catch (err: any) {
      console.error('Error reuploading document:', err);
      toast.update(toastId, {
        render: err.message || 'Failed to update document',
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading('Deleting document...');

    try {
      await onDelete(id, filePath);
      toast.update(toastId, {
        render: 'Document deleted successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
    } catch (err: any) {
      console.error('Error deleting document:', err);
      toast.update(toastId, {
        render: err.message || 'Failed to delete document',
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-100 rounded-lg p-2.5 flex-shrink-0">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate" title={title}>
              {title}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <span>{format(new Date(updatedAt), 'MMM d, yyyy')}</span>
              <span className="mx-1">•</span>
              <Eye className="h-3.5 w-3.5 mr-1" />
              <span>{views} </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleReupload}
                className="hidden"
              />
              <Upload className={`h-5 w-5 ${uploading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
            </label>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-md hover:bg-red-50 transition-colors"
              title="Delete document"
            >
              <Trash2 className={`h-5 w-5 ${isDeleting ? 'text-red-300' : 'text-red-500'}`} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <div className="flex flex-col space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Share Link</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2">
                <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                <span className="text-sm text-gray-600 truncate" title={shareUrl}>
                  {shareUrl}
                </span>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 transition p-2 rounded-lg"
              title="Copy link"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Link
            to={`/view/${id}`}
            className="flex items-center justify-center flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2.5 transition"
          >
            <Eye className="h-4 w-4 mr-2" />
            <span>View</span>
          </Link>
          <Link
            to={`/view/${id}/analytics`}
            className="flex items-center justify-center flex-1 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 font-medium rounded-lg px-4 py-2.5 transition"
          >
            <BarChart className="h-4 w-4 mr-2" />
            <span>Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  );
}