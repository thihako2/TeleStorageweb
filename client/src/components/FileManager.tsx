import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileWithShareInfo } from "@shared/schema";
import FileCard from "./FileCard";
import FileListItem from "./FileListItem";
import {
  ChevronDown,
  FolderPlus,
  Grid,
  List,
  Search,
  Upload,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FileManagerProps {
  files: FileWithShareInfo[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onUploadClick: () => void;
  onPreviewFile: (file: FileWithShareInfo) => void;
  onShareFile: (file: FileWithShareInfo) => void;
  filter: string;
}

export default function FileManager({
  files,
  isLoading,
  viewMode,
  searchQuery,
  onSearchChange,
  onViewModeChange,
  onUploadClick,
  onPreviewFile,
  onShareFile,
  filter,
}: FileManagerProps) {
  const [sortOrder, setSortOrder] = useState<"name" | "date" | "size">("date");

  // Sort files based on the selected sort order
  const sortedFiles = [...files].sort((a, b) => {
    switch (sortOrder) {
      case "name":
        return a.fileName.localeCompare(b.fileName);
      case "size":
        return b.fileSize - a.fileSize;
      case "date":
      default:
        return new Date(b.uploadTimestamp).getTime() - new Date(a.uploadTimestamp).getTime();
    }
  });

  // Get the recent files (first 4 files)
  const recentFiles = sortedFiles.slice(0, 4);
  
  // Get the proper title based on the filter
  const getTitle = () => {
    switch (filter) {
      case "recent":
        return "Recent Files";
      case "starred":
        return "Starred Files";
      case "documents":
        return "Documents";
      case "images":
        return "Images";
      case "audio":
        return "Audio Files";
      case "videos":
        return "Videos";
      case "archives":
        return "Archives";
      case "trash":
        return "Trash";
      default:
        return "All Files";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Actions Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between">
        <div className="w-full sm:w-auto flex items-center space-x-4 mb-4 sm:mb-0">
          <div className="relative rounded-md shadow-sm max-w-xs w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search files..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="hidden sm:flex items-center">
            <span className="text-sm text-gray-500 mr-2">View:</span>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("list")}
              className="mr-1"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewModeChange("grid")}
            >
              <Grid className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="w-full sm:w-auto flex justify-between sm:justify-start space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                Sort by
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortOrder("name")}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("date")}>
                Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("size")}>
                Size
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="secondary"
            onClick={() => {}}
            className="flex items-center"
          >
            <FolderPlus className="mr-2 h-5 w-5" />
            New Folder
          </Button>
          <Button onClick={onUploadClick} className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{getTitle()}</h2>

        {/* Recent Files Section - Only show if we're in the "all" filter */}
        {filter === "all" && !searchQuery && recentFiles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Files</h3>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-lg shadow bg-white overflow-hidden">
                    <div className="p-4 h-32 bg-gray-100">
                      <Skeleton className="h-full w-full" />
                    </div>
                    <div className="p-4 border-t border-gray-200">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={() => onPreviewFile(file)}
                    onShare={() => onShareFile(file)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Files Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {filter === "all" && !searchQuery ? "All Files" : "Files"}
          </h3>
          {isLoading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-lg shadow bg-white overflow-hidden">
                    <div className="p-4 h-32 bg-gray-100">
                      <Skeleton className="h-full w-full" />
                    </div>
                    <div className="p-4 border-t border-gray-200">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {[...Array(8)].map((_, i) => (
                    <li key={i} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="min-w-0 flex-1">
                            <Skeleton className="h-5 w-48 mb-1" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : sortedFiles.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={() => onPreviewFile(file)}
                    onShare={() => onShareFile(file)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {sortedFiles.map((file) => (
                    <FileListItem
                      key={file.id}
                      file={file}
                      onPreview={() => onPreviewFile(file)}
                      onShare={() => onShareFile(file)}
                    />
                  ))}
                </ul>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading a file.
              </p>
              <div className="mt-6">
                <Button onClick={onUploadClick}>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload a file
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
