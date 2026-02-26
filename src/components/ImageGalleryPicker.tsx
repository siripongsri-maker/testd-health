import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Images, Check, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageFile {
  name: string;
  url: string;
  created_at: string;
}

interface ImageGalleryPickerProps {
  onSelect: (url: string) => void;
  trigger?: React.ReactNode;
  language?: string;
}

export function ImageGalleryPicker({ onSelect, trigger, language = 'en' }: ImageGalleryPickerProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadImages();
    }
  }, [open]);

  const loadImages = async () => {
    setLoading(true);
    try {
      // List all files in blog-images bucket (covers and content folders)
      const [coversResult, contentResult] = await Promise.all([
        supabase.storage.from('blog-images').list('covers', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } }),
        supabase.storage.from('blog-images').list('content', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
      ]);

      const allFiles: StorageFile[] = [];

      // Process cover images
      if (coversResult.data) {
        for (const file of coversResult.data) {
          if (file.name && !file.name.startsWith('.')) {
            const { data: { publicUrl } } = supabase.storage
              .from('blog-images')
              .getPublicUrl(`covers/${file.name}`);
            allFiles.push({
              name: file.name,
              url: publicUrl,
              created_at: file.created_at || ''
            });
          }
        }
      }

      // Process content images
      if (contentResult.data) {
        for (const file of contentResult.data) {
          if (file.name && !file.name.startsWith('.')) {
            const { data: { publicUrl } } = supabase.storage
              .from('blog-images')
              .getPublicUrl(`content/${file.name}`);
            allFiles.push({
              name: file.name,
              url: publicUrl,
              created_at: file.created_at || ''
            });
          }
        }
      }

      // Sort by created_at desc
      allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setImages(allFiles);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      setOpen(false);
      setSelectedUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Images className="h-3.5 w-3.5" />
            {language === 'th' ? 'เลือกจากคลัง' : 'Gallery'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {language === 'th' ? 'เลือกรูปภาพจากคลัง' : 'Select from Gallery'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageOff className="h-12 w-12 mb-4 opacity-50" />
            <p>{language === 'th' ? 'ยังไม่มีรูปภาพในคลัง' : 'No images in gallery yet'}</p>
            <p className="text-sm mt-1">
              {language === 'th' ? 'อัพโหลดรูปภาพเพื่อใช้ซ้ำได้ในภายหลัง' : 'Upload images to reuse them later'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((image) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setSelectedUrl(image.url)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-90",
                      selectedUrl === image.url 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {selectedUrl === image.url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="p-1.5 rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button onClick={handleSelect} disabled={!selectedUrl}>
                {language === 'th' ? 'เลือกรูปนี้' : 'Select Image'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}