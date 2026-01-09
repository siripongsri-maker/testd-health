import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Camera, User, Pencil, Check, X, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Cartoon avatar options
const CARTOON_AVATARS = [
  { emoji: '🧑‍⚕️', name: 'Health Pro' },
  { emoji: '🦸', name: 'Hero' },
  { emoji: '🧙', name: 'Wizard' },
  { emoji: '🥷', name: 'Ninja' },
  { emoji: '🧑‍🚀', name: 'Astronaut' },
  { emoji: '🧑‍🎨', name: 'Artist' },
  { emoji: '🦊', name: 'Fox' },
  { emoji: '🐱', name: 'Cat' },
  { emoji: '🐶', name: 'Dog' },
  { emoji: '🐼', name: 'Panda' },
  { emoji: '🦁', name: 'Lion' },
  { emoji: '🐯', name: 'Tiger' },
];

const AVATAR_COLORS = [
  'from-primary to-primary/80',
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
];

interface ProfileSettingsProps {
  onClose?: () => void;
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cartoon' | 'photo'>('cartoon');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data) {
      setDisplayName(data.display_name || user.user_metadata?.display_name || '');
      setAvatarUrl(data.avatar_url);
      
      // Check if avatar_url is an emoji
      if (data.avatar_url && data.avatar_url.startsWith('emoji:')) {
        const parts = data.avatar_url.split(':');
        setSelectedEmoji(parts[1]);
        setSelectedColor(parseInt(parts[2]) || 0);
      }
    } else {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      
      // If using emoji avatar, store as special format
      if (selectedEmoji && activeTab === 'cartoon') {
        finalAvatarUrl = `emoji:${selectedEmoji}:${selectedColor}`;
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      toast.success(language === 'th' ? 'บันทึกโปรไฟล์สำเร็จ!' : 'Profile saved!');
      setIsEditing(false);
      onClose?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'Please select an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'th' ? 'ไฟล์ต้องมีขนาดไม่เกิน 2MB' : 'File must be less than 2MB');
      return;
    }
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
      setSelectedEmoji(null);
      toast.success(language === 'th' ? 'อัพโหลดรูปสำเร็จ!' : 'Photo uploaded!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const selectEmojiAvatar = (emoji: string) => {
    setSelectedEmoji(emoji);
    setAvatarUrl(null);
  };

  // Render avatar preview
  const renderAvatarPreview = () => {
    if (avatarUrl && !avatarUrl.startsWith('emoji:')) {
      return (
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      );
    }
    
    if (selectedEmoji) {
      return (
        <div className={cn(
          "w-full h-full flex items-center justify-center bg-gradient-to-br text-5xl",
          AVATAR_COLORS[selectedColor]
        )}>
          {selectedEmoji}
        </div>
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
        <User className="h-12 w-12 text-primary-foreground" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Avatar Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-xl">
            {renderAvatarPreview()}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        
        {/* Display Name */}
        <div className="text-center">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={language === 'th' ? 'ชื่อที่แสดง' : 'Display name'}
                className="text-center h-10"
              />
            </div>
          ) : (
            <h3 className="text-xl font-bold text-foreground">{displayName || 'Anonymous'}</h3>
          )}
        </div>
      </div>

      {/* Avatar Selection (when editing) */}
      {isEditing && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab('cartoon')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                activeTab === 'cartoon'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {language === 'th' ? '🎭 การ์ตูน' : '🎭 Cartoon'}
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                activeTab === 'photo'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {language === 'th' ? '📷 รูปถ่าย' : '📷 Photo'}
            </button>
          </div>

          {activeTab === 'cartoon' && (
            <div className="space-y-4">
              {/* Emoji Grid */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  {language === 'th' ? 'เลือกอวาตาร์' : 'Choose Avatar'}
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {CARTOON_AVATARS.map((avatar, i) => (
                    <button
                      key={i}
                      onClick={() => selectEmojiAvatar(avatar.emoji)}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110",
                        "bg-gradient-to-br",
                        selectedEmoji === avatar.emoji 
                          ? cn(AVATAR_COLORS[selectedColor], "border-2 border-primary scale-110") 
                          : "bg-muted border border-border"
                      )}
                    >
                      {avatar.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              {selectedEmoji && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    {language === 'th' ? 'เลือกสีพื้นหลัง' : 'Background Color'}
                  </Label>
                  <div className="flex gap-2">
                    {AVATAR_COLORS.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColor(i)}
                        className={cn(
                          "w-10 h-10 rounded-full bg-gradient-to-br transition-all hover:scale-110",
                          color,
                          selectedColor === i ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'photo' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-12 gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {language === 'th' ? 'กำลังอัพโหลด...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    {language === 'th' ? 'อัพโหลดรูปภาพ' : 'Upload Photo'}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                {language === 'th' 
                  ? 'รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB' 
                  : 'Supports JPG, PNG up to 2MB'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                loadProfile(); // Reset changes
              }}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {language === 'th' ? 'บันทึก' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Edit Button (when not editing) */}
      {!isEditing && (
        <Button
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="w-full"
        >
          <Pencil className="h-4 w-4 mr-2" />
          {language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}
        </Button>
      )}
    </div>
  );
}