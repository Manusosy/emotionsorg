import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  BookOpen, 
  Video, 
  Headphones, 
  Users, 
  FileText, 
  Calendar, 
  ExternalLink,
  Bookmark,
  BookmarkPlus,
  Share2,
  Download,
  ChevronRight,
  Clock3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// Resource type definition
interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast' | 'document' | 'group' | 'workshop';
  category: string;
  author: string;
  authorRole: string;
  authorAvatar?: string;
  date: string;
  readTime?: string;
  duration?: string;
  description: string;
  imageUrl: string;
  tags: string[];
  url: string;
  featured?: boolean;
  savedByUser?: boolean;
  downloads?: number;
  shares?: number;
  mood_mentor_id?: string;
}

// Sample resources data
const resources: Resource[] = [
  {
    id: "article-1",
    title: "Understanding Emotional Well-being",
    type: "article",
    category: "education",
    author: "Dr. Ruby Perrin",
    authorRole: "Depression & Anxiety Specialist",
    authorAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    date: "April 12, 2025",
    readTime: "6 min read",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "Learn the fundamentals of emotional health and how it impacts your daily life.",
    tags: ["basics", "wellbeing", "mental health"],
    url: "/resources/understanding-emotional-wellbeing",
    featured: true,
    mood_mentor_id: "1"
  },
  {
    id: "video-1",
    title: "Guided Meditation for Anxiety Relief",
    type: "video",
    category: "meditation",
    author: "Dr. Deborah Angel",
    authorRole: "Relationship & Family Specialist",
    authorAvatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    date: "April 15, 2025",
    duration: "15 minutes",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "A calming guided meditation to help reduce anxiety and promote relaxation.",
    tags: ["meditation", "anxiety", "relaxation"],
    url: "/resources/guided-meditation-anxiety",
    featured: true,
    mood_mentor_id: "3"
  },
  {
    id: "document-1",
    title: "Managing Anxiety Guide",
    type: "document",
    category: "anxiety",
    author: "Dr. Darren Elder",
    authorRole: "Trauma & PTSD Specialist",
    authorAvatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    date: "April 8, 2025",
    readTime: "12 min read",
    imageUrl: "https://images.unsplash.com/photo-1576671414121-aa2d0967ca99?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "A comprehensive guide to understanding and managing anxiety",
    tags: ["anxiety", "management", "self-help"],
    url: "/resources/managing-anxiety-guide",
    downloads: 128,
    shares: 45,
    mood_mentor_id: "2"
  },
  {
    id: "podcast-1",
    title: "The Science of Happiness",
    type: "podcast",
    category: "education",
    author: "Dr. Ruby Perrin",
    authorRole: "Depression & Anxiety Specialist",
    authorAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    date: "April 5, 2025",
    duration: "42 minutes",
    imageUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "Exploring the scientific research behind happiness and practical ways to boost your mood.",
    tags: ["science", "happiness", "research"],
    url: "/resources/science-of-happiness",
    mood_mentor_id: "1"
  },
  {
    id: "group-1",
    title: "Anxiety Support Community",
    type: "group",
    category: "support",
    author: "Jennifer Lopez",
    authorRole: "Licensed Therapist",
    date: "Weekly",
    imageUrl: "https://images.unsplash.com/photo-1536080805909-cef9abad7c25?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "A supportive community for individuals dealing with anxiety and stress.",
    tags: ["anxiety", "support", "community"],
    url: "/resources/anxiety-support-community",
    mood_mentor_id: "3"
  },
  {
    id: "workshop-1",
    title: "Building Resilience Workshop",
    type: "workshop",
    category: "education",
    author: "Dr. Darren Elder",
    authorRole: "Trauma & PTSD Specialist",
    authorAvatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
    date: "April 18, 2025",
    duration: "3 hours",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
    description: "Learn practical skills to build emotional resilience and overcome life's challenges.",
    tags: ["resilience", "workshop", "skills"],
    url: "/resources/building-resilience-workshop",
    mood_mentor_id: "2",
    featured: true
  }
];

export default function ResourcesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [savedResources, setSavedResources] = useState<string[]>([]);

  // Filter resources based on search and active tab
  const filteredResources = resources.filter(resource => {
    // Check if search query matches
    const matchesSearch = searchQuery === "" || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Check if tab matches
    const matchesTab = activeTab === "all" || 
      (activeTab === "articles" && resource.type === "article") ||
      (activeTab === "videos" && resource.type === "video") ||
      (activeTab === "podcasts" && resource.type === "podcast") ||
      (activeTab === "groups" && resource.type === "group") ||
      (activeTab === "workshops" && resource.type === "workshop") ||
      (activeTab === "documents" && resource.type === "document") ||
      (activeTab === "saved" && savedResources.includes(resource.id));
    
    return matchesSearch && matchesTab;
  });

  // Get featured resources
  const featuredResources = resources.filter(resource => resource.featured);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already applied through the filter
  };

  const handleSaveResource = useCallback((resourceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    if (savedResources.includes(resourceId)) {
      setSavedResources(prev => prev.filter(id => id !== resourceId));
      toast("Resource removed from your saved items");
    } else {
      setSavedResources(prev => [...prev, resourceId]);
      toast("Resource saved to your collection");
    }
  }, [savedResources]);

  const handleShareResource = useCallback((resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    // In a real app, this would open a share dialog
    try {
      navigator.clipboard.writeText(`Check out this resource: ${resource.title} - ${window.location.origin}${resource.url}`);
      toast("Resource link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy", error);
      toast.error("Failed to copy link to clipboard");
    }
  }, []);

  const handleDownloadResource = useCallback((resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    // In a real app, this would trigger a download
    toast(`Downloading ${resource.title}`);
  }, []);

  const handleResourceClick = useCallback((url: string) => {
    navigate(url);
  }, [navigate]);

  // Get the icon for the resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "article":
        return <FileText className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "podcast":
        return <Headphones className="h-5 w-5" />;
      case "group":
        return <Users className="h-5 w-5" />;
      case "workshop":
        return <Calendar className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case "article":
        return "bg-blue-100 text-blue-800";
      case "document":
        return "bg-amber-100 text-amber-800";
      case "video":
        return "bg-red-100 text-red-800";
      case "podcast":
        return "bg-purple-100 text-purple-800";
      case "group":
        return "bg-green-100 text-green-800";
      case "workshop":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Resource list component
  const ResourceList = () => {
    if (filteredResources.length === 0) {
      return (
        <Card className="p-6 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">No resources found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery 
              ? "Try a different search term or category" 
              : "Resources will be available soon"}
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredResources.map(resource => (
          <Card 
            key={resource.id} 
            className="hover:shadow-md transition overflow-hidden cursor-pointer"
            onClick={() => handleResourceClick(resource.url)}
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/4 h-48 md:h-auto relative">
                <img
                  src={resource.imageUrl}
                  alt={resource.title}
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/400x300?text=Resource+Image";
                  }}
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={getCategoryColor(resource.type)}>
                    <div className="flex items-center gap-1">
                      {getResourceIcon(resource.type)}
                      <span>{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="p-5 md:w-3/4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium mb-1">{resource.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">
                      {resource.type === 'article' || resource.type === 'document' ? `${resource.readTime} • ` : 
                      resource.type === 'video' || resource.type === 'podcast' || resource.type === 'workshop' ? `${resource.duration} • ` : 
                      ''}
                      {resource.date}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleSaveResource(resource.id, e)}
                      type="button"
                    >
                      {savedResources.includes(resource.id) ? (
                        <Bookmark className="h-4 w-4 fill-current" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleShareResource(resource, e)}
                      type="button"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {(resource.type === 'document' || resource.type === 'video' || resource.type === 'podcast') && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => handleDownloadResource(resource, e)}
                        type="button"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-600 mb-3">{resource.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {resource.authorAvatar ? (
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage 
                          src={resource.authorAvatar} 
                          alt={resource.author}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <span className="text-sm font-medium">{resource.author}</span>
                      <span className="text-xs text-slate-500 block">{resource.authorRole}</span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(resource.url);
                    }}
                    type="button"
                  >
                    View Resource
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const FeaturedResourceCard = ({ resource }: { resource: Resource }) => (
    <Card 
      key={resource.id} 
      className="overflow-hidden hover:shadow-md transition cursor-pointer"
      onClick={() => handleResourceClick(resource.url)}
    >
      <div className="aspect-video w-full relative">
        <img
          src={resource.imageUrl}
          alt={resource.title}
          className="object-cover w-full h-full"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/400x300?text=Resource+Image";
          }}
          loading="lazy"
        />
        <div className="absolute top-3 right-3">
          <Badge className={getCategoryColor(resource.type)}>
            <div className="flex items-center gap-1">
              {getResourceIcon(resource.type)}
              <span>{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
            </div>
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 left-3 h-8 w-8 bg-white/80 hover:bg-white"
          onClick={(e) => handleSaveResource(resource.id, e)}
          type="button"
        >
          {savedResources.includes(resource.id) ? (
            <Bookmark className="h-4 w-4 fill-current" />
          ) : (
            <BookmarkPlus className="h-4 w-4" />
          )}
        </Button>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{resource.title}</CardTitle>
        <CardDescription>
          {resource.type === 'article' || resource.type === 'document' ? `${resource.readTime} • ` : 
          resource.type === 'video' || resource.type === 'podcast' || resource.type === 'workshop' ? `${resource.duration} • ` : 
          ''}
          {resource.date}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {resource.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <div className="flex items-center text-sm text-slate-500">
          {resource.authorAvatar ? (
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage 
                src={resource.authorAvatar} 
                alt={resource.author}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <span className="line-clamp-1">{resource.author}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(resource.url);
          }}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Resources</h1>
            <p className="text-slate-500">
              Access educational content and tools to support your mental health journey
            </p>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-10 pr-4 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="groups">Support Groups</TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-8">
            {featuredResources.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-medium mb-4">Featured Resources</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
                  {featuredResources.map(resource => (
                    <FeaturedResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-medium mb-4">
                All Resources
              </h2>
              <ResourceList />
            </div>
          </TabsContent>
          
          <TabsContent value="articles" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="videos" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="podcasts" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="groups" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="workshops" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-8">
            {savedResources.length === 0 ? (
              <Card className="p-6 text-center">
                <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">No saved resources</h3>
                <p className="text-slate-500 mb-4">
                  Save resources to access them later
                </p>
              </Card>
            ) : (
              <ResourceList />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 