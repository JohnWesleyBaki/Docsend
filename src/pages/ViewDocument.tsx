import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft  } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PDFControls from '../components/document-viewer/PDFControls';
import PDFThumbnails from '../components/document-viewer/PDFThumbnails';
import UAParser from 'ua-parser-js';
import { useNavigate } from 'react-router-dom';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const ANALYTICS_SAVE_INTERVAL = 30000; // 30 seconds
const INITIAL_SCALE = 1;
const SCALE_STEP = 0.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export default function ViewDocument() {
  const { documentId } = useParams<{ documentId: string }>();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>('Document');
  const [viewId, setViewId] = useState<string | null>(null);
  const [pageTimes, setPageTimes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(INITIAL_SCALE);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [thumbnailsLoading, setThumbnailsLoading] = useState<boolean>(true);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const navigate = useNavigate();

  const viewerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const saveAnalyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const ipapiKey = import.meta.env.VITE_IPAPI_KEY;

  const checkScreenSize = useCallback(() => {
    const isSmall = window.innerWidth < 768;
    setIsSmallScreen(isSmall);
    if (isSmall) setShowThumbnails(false);
  }, []);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      console.log("Fetching document with ID:", documentId);
      
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600);
      
      if (signedError) throw signedError;
      
      setDocumentUrl(signedData.signedUrl);
      setDocumentTitle(document.title || 'Document');
    } catch (err: any) {
      console.error('Error fetching document:', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const initializeView = useCallback(async () => {
    if (!documentId) return;

    try {
      let locationData = { city: 'Unknown', region_name: 'Unknown', country_name: 'Unknown' };
      
      try {
        const locationResponse = await fetch(`https://api.ipapi.com/check?access_key=${ipapiKey}`);
        locationData = await locationResponse.json();
      } catch (err) {
        console.error("Error fetching location data:", err);
      }
      
      const parser = new UAParser();
      const result = parser.getResult();
      const deviceInfo = {
        browser: `${result.browser.name || ''} ${result.browser.version || ''}`,
        os: `${result.os.name || ''} ${result.os.version || ''}`,
        device: result.device.type || 'desktop'
      };

      const viewerLocation = {
        city: locationData.city || 'Unknown',
        region: locationData.region_name || 'Unknown',
        country: locationData.country_name || 'Unknown'
      };
      
      const { data, error } = await supabase
        .from('document_views')
        .insert({
          document_id: documentId,
          location: viewerLocation,
          device_info: deviceInfo,
          total_time: 0,
          page_times: {}
        })
        .select()
        .single();

      if (error) throw error;
      
      setViewId(data.id);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error initializing view:', err);
    }
  }, [documentId, ipapiKey]);

  const saveAnalytics = useCallback(async () => {
    if (!viewId) return;

    try {
      const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const formattedPageTimes: Record<string, number> = {};
      Object.entries(pageTimes).forEach(([page, time]) => {
        formattedPageTimes[page] = time;
      });

      await supabase
        .from('document_views')
        .update({
          total_time: totalTime,
          page_times: formattedPageTimes,
          updated_at: new Date().toISOString()
        })
        .eq('id', viewId);
    } catch (err) {
      console.error('Error saving analytics:', err);
    }
  }, [viewId, pageTimes]);

  const handleZoom = useCallback((amount: number) => {
    setScale(prevScale => Math.min(Math.max(prevScale + amount, MIN_SCALE), MAX_SCALE));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!documentUrl || !viewId || !documentId) return;

    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = `${documentTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    supabase
      .from('document_events')
      .insert({
        document_id: documentId,
        view_id: viewId,
        event_type: 'download',
        event_data: { timestamp: new Date().toISOString() }
      })
      .then(() => console.log("Download event tracked"))
      .catch(err => console.error("Error tracking download event:", err));
  }, [documentUrl, documentTitle, viewId, documentId]);

  const handlePageChange = useCallback((newPage: number) => {
    if (!viewId || !documentId) return;

    supabase
      .from('document_events')
      .insert({
        document_id: documentId,
        view_id: viewId,
        event_type: 'page_change',
        event_data: { from: currentPage, to: newPage, timestamp: new Date().toISOString() }
      })
      .then(() => console.log("Page change event tracked"))
      .catch(err => console.error("Error tracking page change event:", err));
    
    setCurrentPage(newPage);
  }, [viewId, documentId, currentPage]);

  useEffect(() => {
    fetchDocument();
    initializeView();
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [fetchDocument, initializeView, checkScreenSize]);

  useEffect(() => {
    if (pageTimerRef.current) {
      clearInterval(pageTimerRef.current);
    }

    pageTimerRef.current = setInterval(() => {
      setPageTimes(prev => ({
        ...prev,
        [currentPage]: (prev[currentPage] || 0) + 1
      }));
    }, 1000);

    return () => {
      if (pageTimerRef.current) {
        clearInterval(pageTimerRef.current);
      }
    };
  }, [currentPage]);

  useEffect(() => {
    if (saveAnalyticsTimeoutRef.current) {
      clearInterval(saveAnalyticsTimeoutRef.current);
    }

    saveAnalyticsTimeoutRef.current = setInterval(saveAnalytics, ANALYTICS_SAVE_INTERVAL);

    return () => {
      saveAnalytics();
      if (saveAnalyticsTimeoutRef.current) {
        clearInterval(saveAnalyticsTimeoutRef.current);
      }
    };
  }, [saveAnalytics]);

  if (error || loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        {error ? (
          <div className="text-center bg-red-50 p-8 rounded-lg shadow-sm border border-red-200 max-w-md">
            <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg font-medium text-red-600 mb-2">Unable to Load Document</p>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Loading document...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6" ref={viewerRef}>
      <div ><button onClick={()=>{navigate(-1)}}><ArrowLeft /></button></div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{documentTitle}</h1>
        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          {numPages && (
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
              style={{ width: `${(currentPage / numPages) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {showThumbnails && !isSmallScreen && (
          <PDFThumbnails
            documentUrl={documentUrl!}
            numPages={numPages || 0}
            currentPage={currentPage}
            onPageSelect={handlePageChange}
            onClose={() => setShowThumbnails(false)}
            loading={thumbnailsLoading}
          />
        )}

        <div className="flex-1">
          <PDFControls
            currentPage={currentPage}
            numPages={numPages}
            scale={scale}
            isFullscreen={isFullscreen}
            onPageChange={handlePageChange}
            onZoom={handleZoom}
            onRotate={handleRotate}
            onFullscreen={toggleFullscreen}
            onDownload={handleDownload}
            showThumbnails={showThumbnails}
            onToggleThumbnails={() => setShowThumbnails(prev => !prev)}
            isSmallScreen={isSmallScreen}
          />

          <div className="bg-gray-100 rounded-b-lg border-x border-b border-gray-200 p-6 min-h-[70vh] flex items-center justify-center shadow-sm">
            {documentUrl && (
              <Document
                file={documentUrl}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  setLoading(false);
                  setTimeout(() => setThumbnailsLoading(false), 1000);
                }}
                onLoadError={(error) => {
                  console.error("Error loading PDF:", error);
                  setError("Failed to load the document. Please try again later.");
                }}
                loading={
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading document...</p>
                  </div>
                }
                className="mx-auto"
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  scale={scale}
                  rotate={rotation}
                  className="mx-auto shadow-lg transition-all duration-300 ease-in-out"
                  loading={
                    <div className="flex justify-center items-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  }
                />
              </Document>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}