import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MainHeader from "@/components/MainHeader";
import Sidebar from "@/components/Sidebar";
import FileManager from "@/components/FileManager";
import UploadModal from "@/components/modals/UploadModal";
import FilePreviewModal from "@/components/modals/FilePreviewModal";
import ShareFileModal from "@/components/modals/ShareFileModal";
import { getUserFiles, getRecentFiles, getFilesByType } from "@/lib/api";
import { FileWithShareInfo } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState("all");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithShareInfo | null>(null);
  const [shareFile, setShareFile] = useState<FileWithShareInfo | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Get files based on filter
  const getFilesForFilter = () => {
    switch (filter) {
      case "recent":
        return { queryKey: ['/api/files/recent'], queryFn: () => getRecentFiles(20) };
      case "starred":
        return { queryKey: ['/api/files/type/starred'], queryFn: () => getFilesByType('starred') };
      case "documents":
        return { queryKey: ['/api/files/type/document'], queryFn: () => getFilesByType('document') };
      case "images":
        return { queryKey: ['/api/files/type/image'], queryFn: () => getFilesByType('image') };
      case "audio":
        return { queryKey: ['/api/files/type/audio'], queryFn: () => getFilesByType('audio') };
      case "videos":
        return { queryKey: ['/api/files/type/video'], queryFn: () => getFilesByType('video') };
      case "archives":
        return { queryKey: ['/api/files/type/archive'], queryFn: () => getFilesByType('archive') };
      case "trash":
        return { queryKey: ['/api/files/type/trash'], queryFn: () => getFilesByType('trash') };
      default:
        return { queryKey: ['/api/files'], queryFn: getUserFiles };
    }
  };

  // Fetch files
  const { queryKey, queryFn } = getFilesForFilter();
  const { data: files = [], isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled: !!user,
  });

  // Filter files based on search query
  const filteredFiles = searchQuery 
    ? files.filter(file => file.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
  };

  // Handle file upload
  const handleFileUploaded = () => {
    // Invalidate queries to reload files
    queryClient.invalidateQueries({ queryKey: ['/api/files'] });
    queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
    
    toast({
      title: "File Uploaded",
      description: "Your file has been successfully uploaded.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader onUploadClick={() => setUploadModalOpen(true)} />
      
      <div className="flex-grow flex overflow-hidden">
        <Sidebar 
          userData={user!} 
          selectedFilter={filter} 
          onFilterChange={handleFilterChange} 
        />
        
        <FileManager
          files={filteredFiles}
          isLoading={isLoading}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onViewModeChange={setViewMode}
          onUploadClick={() => setUploadModalOpen(true)}
          onPreviewFile={setPreviewFile}
          onShareFile={setShareFile}
          filter={filter}
        />
      </div>

      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onFileUploaded={handleFileUploaded}
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
