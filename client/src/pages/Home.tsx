import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainHeader from "@/components/MainHeader";
import { useAuth } from "@/contexts/AuthContext";
import UploadModal from "@/components/modals/UploadModal";
import { getRecentFiles, getFilesByType } from "@/lib/api";
import FileCard from "@/components/FileCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { File as FileIcon, Upload } from "lucide-react";
import FilePreviewModal from "@/components/modals/FilePreviewModal";
import { FileWithShareInfo } from "@shared/schema";
import ShareFileModal from "@/components/modals/ShareFileModal";

export default function Home() {
  const { user } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithShareInfo | null>(null);
  const [shareFile, setShareFile] = useState<FileWithShareInfo | null>(null);

  // Fetch recent files
  const { data: recentFiles = [], isLoading: recentFilesLoading } = useQuery({
    queryKey: ['/api/files/recent'],
    enabled: !!user,
  });

  // Fetch document files
  const { data: documentFiles = [], isLoading: documentFilesLoading } = useQuery({
    queryKey: ['/api/files/type/document'],
    queryFn: () => getFilesByType('document'),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader onUploadClick={() => setUploadModalOpen(true)} />
      
      <main className="flex-grow bg-gray-50">
        {/* Hero section */}
        <div className="relative bg-white pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-28 lg:px-8">
          <div className="absolute inset-0">
            <div className="bg-white h-1/3 sm:h-2/3"></div>
          </div>
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-3xl tracking-tight font-extrabold text-gray-900 sm:text-4xl">
                Welcome to TeleStore
              </h1>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                Your secure cloud storage powered by Telegram
              </p>
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <Button 
                    size="lg"
                    onClick={() => setUploadModalOpen(true)}
                    className="w-full flex items-center justify-center"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Upload Files
                  </Button>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full flex items-center justify-center"
                  >
                    <FileIcon className="mr-2 h-5 w-5" />
                    Browse Files
                  </Button>
                </div>
              </div>
            </div>

            {/* Recent Files */}
            {recentFiles.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Files</h2>
                  <Link href="/dashboard">
                    <a className="text-sm font-medium text-primary hover:text-blue-700">
                      View all files
                    </a>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recentFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file}
                      onPreview={() => setPreviewFile(file)}
                      onShare={() => setShareFile(file)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Document Files */}
            {documentFiles.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Document Files</h2>
                  <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard?type=documents'}>
                    View all documents
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {documentFiles.slice(0, 4).map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file}
                      onPreview={() => setPreviewFile(file)}
                      onShare={() => setShareFile(file)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
      />

      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />
      )}

      {shareFile && (
        <ShareFileModal
          isOpen={!!shareFile}
          onClose={() => setShareFile(null)}
          file={shareFile}
        />
      )}
    </div>
  );
}
