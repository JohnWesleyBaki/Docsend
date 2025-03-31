import React from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, Loader } from 'lucide-react';

interface PDFThumbnailsProps {
  documentUrl: string;
  numPages: number;
  currentPage: number;
  onPageSelect: (pageNumber: number) => void;
  onClose: () => void;
  loading: boolean;
}

export default function PDFThumbnails({
  documentUrl,
  numPages,
  currentPage,
  onPageSelect,
  onClose,
  loading,
}: PDFThumbnailsProps) {
  return (
    <div className="w-full lg:w-48 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 p-3 h-[calc(100vh-240px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">Pages</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col space-y-3 items-center justify-center h-full">
          <Loader className="h-5 w-5 text-blue-500 animate-spin" />
          <p className="text-xs text-gray-500">Loading thumbnails...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`thumb-${index + 1}`}
              className={`cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                currentPage === index + 1 ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => onPageSelect(index + 1)}
            >
              <Document file={documentUrl} className="thumbnail-doc">
                <Page
                  pageNumber={index + 1}
                  width={120}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mx-auto"
                />
              </Document>
              <div className="text-xs text-center py-1 bg-gray-100">{index + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}