import { Link, useLocation } from "wouter";
import { cn, formatBytes } from "@/lib/utils";
import { 
  FileText, 
  Calendar, 
  Star, 
  Users, 
  Trash2, 
  FileImage, 
  Music, 
  Video, 
  Archive 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { UserWithStorage } from "@shared/schema";

interface SidebarProps {
  userData: UserWithStorage;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function Sidebar({ userData, selectedFilter, onFilterChange }: SidebarProps) {
  const [location] = useLocation();
  
  const usedStorage = formatBytes(userData.storageInfo.used);
  const totalStorage = formatBytes(userData.storageInfo.total);
  
  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex-grow flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-4">
            <h2 className="text-lg font-semibold text-gray-900">My Storage</h2>
            <div className="mt-4">
              <Progress value={userData.storageInfo.percentage} className="h-2.5" />
              <p className="mt-2 text-xs text-gray-500">
                <span className="font-medium text-gray-900">{usedStorage}</span> of{' '}
                <span className="font-medium text-gray-900">{totalStorage}</span> used
              </p>
            </div>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            <Link href="/dashboard">
              <a 
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  (location === "/dashboard" && selectedFilter === "all") 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("all")}
              >
                <FileText className="mr-3 h-6 w-6 text-gray-500" />
                All Files
              </a>
            </Link>
            <a 
              href="#"
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                selectedFilter === "recent" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={() => onFilterChange("recent")}
            >
              <Calendar className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
              Recent
            </a>
            <a 
              href="#"
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                selectedFilter === "starred" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={() => onFilterChange("starred")}
            >
              <Star className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
              Starred
            </a>
            <Link href="/shared">
              <a 
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === "/shared"
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Users className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                Shared with me
              </a>
            </Link>
            <a 
              href="#"
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                selectedFilter === "trash" 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              onClick={() => onFilterChange("trash")}
            >
              <Trash2 className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
              Trash
            </a>
          </nav>

          <div className="px-4 mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">File Types</h3>
            <div className="mt-2 space-y-1">
              <a 
                href="#"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  selectedFilter === "documents" 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("documents")}
              >
                <FileText className="mr-3 h-5 w-5 text-blue-500" />
                Documents
              </a>
              <a 
                href="#"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  selectedFilter === "images" 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("images")}
              >
                <FileImage className="mr-3 h-5 w-5 text-red-500" />
                Images
              </a>
              <a 
                href="#"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  selectedFilter === "audio" 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("audio")}
              >
                <Music className="mr-3 h-5 w-5 text-purple-500" />
                Audio
              </a>
              <a 
                href="#"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  selectedFilter === "videos" 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("videos")}
              >
                <Video className="mr-3 h-5 w-5 text-green-500" />
                Videos
              </a>
              <a 
                href="#"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  selectedFilter === "archives" 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                onClick={() => onFilterChange("archives")}
              >
                <Archive className="mr-3 h-5 w-5 text-yellow-500" />
                Archives
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
