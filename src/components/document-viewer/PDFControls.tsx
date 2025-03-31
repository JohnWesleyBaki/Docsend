import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize, Minimize, Download } from 'lucide-react';

interface PDFControlsProps {
  currentPage: number;
  numPages: number | null;
  scale: number;
  isFullscreen: boolean;
  onPageChange: (newPage: number) => void;
  onZoom: (amount: number) => void;
  onRotate: () => void;
  onFullscreen: () => void;
  onDownload: () => void;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  isSmallScreen: boolean;
}

export default function PDFControls({
  currentPage,
  numPages,
  scale,
  isFullscreen,
  onPageChange,
  onZoom,
  onRotate,
  onFullscreen,
  onDownload,
  showThumbnails,
  onToggleThumbnails,
  isSmallScreen,
}: PDFControlsProps) {
  return (
    <div className="bg-white rounded-t-lg border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center space-x-1">
        {!showThumbnails && !isSmallScreen && (
          <button
            onClick={onToggleThumbnails}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Show thumbnails"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, numPages || 1))}
          disabled={currentPage >= (numPages || 1)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="px-3 py-1 bg-gray-50 rounded-md border border-gray-200 text-sm font-medium">
          {currentPage} / {numPages || '?'}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onZoom(-0.2)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <div className="px-2 py-1 text-sm">{Math.round(scale * 50)}%</div>
        <button
          onClick={() => onZoom(0.2)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={onRotate}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title="Rotate"
        >
          <RotateCw className="h-5 w-5" />
        </button>
        <button
          onClick={onFullscreen}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
        <button
          onClick={onDownload}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title="Download"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}