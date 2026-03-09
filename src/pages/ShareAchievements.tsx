import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, Upload, Share2, Instagram, Facebook, Twitter, Sparkles, Image, X, Type, Smile, Move, Trash2 } from "lucide-react";
import swingLogo from "@/assets/swing-logo.png";

const FRAME_STYLES = [
  {
    id: 'pride',
    name: 'Pride',
    nameTh: 'ไพรด์',
    borderClass: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
  },
  {
    id: 'testd',
    name: 'testD',
    nameTh: 'testD',
    borderClass: 'bg-gradient-to-r from-primary via-accent to-primary',
  },
  {
    id: 'love',
    name: 'Love',
    nameTh: 'ความรัก',
    borderClass: 'bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400',
  },
];

const STICKERS = [
  { id: 'heart', emoji: '❤️' },
  { id: 'rainbow', emoji: '🌈' },
  { id: 'star', emoji: '⭐' },
  { id: 'fire', emoji: '🔥' },
  { id: 'sparkle', emoji: '✨' },
  { id: 'thumbsup', emoji: '👍' },
  { id: 'muscle', emoji: '💪' },
  { id: 'party', emoji: '🎉' },
  { id: 'ribbon', emoji: '🎀' },
  { id: 'love', emoji: '💕' },
  { id: 'crown', emoji: '👑' },
  { id: 'check', emoji: '✅' },
];

interface StickerItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

const TEXT_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function ShareAchievements() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_STYLES[0].id);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeTab, setActiveTab] = useState<'frame' | 'stickers' | 'text'>('frame');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [newText, setNewText] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setCapturedImage(null);
    setStickers([]);
    setTexts([]);
    stopCamera();
  };

  const addSticker = (emoji: string) => {
    const newSticker: StickerItem = {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 50,
      y: 50,
      scale: 1,
    };
    setStickers([...stickers, newSticker]);
  };

  const addText = () => {
    if (!newText.trim()) return;
    const newTextItem: TextItem = {
      id: `text-${Date.now()}`,
      text: newText,
      x: 50,
      y: 30,
      color: selectedTextColor,
    };
    setTexts([...texts, newTextItem]);
    setNewText('');
  };

  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id));
  };

  const removeText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
  };

  const handleDragStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setDraggingId(id);
  };

  const handleDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingId || !photoContainerRef.current) return;
    
    const container = photoContainerRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - container.left) / container.width) * 100;
    const y = ((clientY - container.top) / container.height) * 100;
    
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));
    
    if (draggingId.startsWith('sticker')) {
      setStickers(stickers.map(s => 
        s.id === draggingId ? { ...s, x: clampedX, y: clampedY } : s
      ));
    } else {
      setTexts(texts.map(t => 
        t.id === draggingId ? { ...t, x: clampedX, y: clampedY } : t
      ));
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleShare = async (platform: 'instagram' | 'facebook' | 'twitter') => {
    const message = language === 'th' 
      ? 'คนเทสต์ดีอยู่นี่จ้า 💪 #testD #SWINGThailand #SelfCare' 
      : "I'm taking care of my health! 💪 #testD #SWINGThailand #SelfCare";
    const encodedMessage = encodeURIComponent(message);

    if (capturedImage && navigator.share && navigator.canShare) {
      try {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], 'testd-share.jpg', { type: 'image/jpeg' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            text: message,
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.log('Web Share failed, falling back to URL share');
      }
    }

    const urls: Record<string, string> = {
      instagram: 'https://www.instagram.com/',
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const downloadImage = async () => {
    if (!capturedImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      const size = Math.max(img.width, img.height);
      const padding = 40;
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2 + 80;

      // Draw frame background
      const frame = FRAME_STYLES.find(f => f.id === selectedFrame);
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      if (frame?.id === 'pride') {
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(0.2, '#eab308');
        gradient.addColorStop(0.4, '#22c55e');
        gradient.addColorStop(0.6, '#3b82f6');
        gradient.addColorStop(0.8, '#a855f7');
        gradient.addColorStop(1, '#ef4444');
      } else if (frame?.id === 'love') {
        gradient.addColorStop(0, '#f472b6');
        gradient.addColorStop(0.5, '#f43f5e');
        gradient.addColorStop(1, '#f472b6');
      } else {
        gradient.addColorStop(0, '#14a8a8');
        gradient.addColorStop(0.5, '#f97316');
        gradient.addColorStop(1, '#14a8a8');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw white background for image
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(padding - 4, padding - 4, size + 8, size + 8);

      // Draw the image centered
      const x = padding + (size - img.width) / 2;
      const y = padding + (size - img.height) / 2;
      ctx.drawImage(img, x, y);

      // Draw stickers
      ctx.font = '48px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      stickers.forEach(sticker => {
        const stickerX = padding + (sticker.x / 100) * size;
        const stickerY = padding + (sticker.y / 100) * size;
        ctx.font = `${48 * sticker.scale}px serif`;
        ctx.fillText(sticker.emoji, stickerX, stickerY);
      });

      // Draw texts
      texts.forEach(text => {
        const textX = padding + (text.x / 100) * size;
        const textY = padding + (text.y / 100) * size;
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = text.color;
        ctx.strokeStyle = text.color === '#ffffff' ? '#000000' : '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeText(text.text, textX, textY);
        ctx.fillText(text.text, textX, textY);
      });

      // Draw branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'transparent';
      ctx.fillText(language === 'th' ? 'testD คนเทสต์ดีอยู่นี่จ้า' : 'testD — Good testers are right here!', canvas.width / 2, canvas.height - 45);
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('#testD #SWINGThailand', canvas.width / 2, canvas.height - 20);

      // Download
      const link = document.createElement('a');
      link.download = 'testd-share.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    };
    img.src = capturedImage;
  };

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? 'ชวนเพื่อน' : 'Share with Friends'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'th' ? 'ถ่ายรูปและแชร์บนโซเชียล' : 'Take a photo and share on social'}
            </p>
          </div>
        </div>

        {/* Camera / Photo Section */}
        <Card className="p-4 mb-6 overflow-hidden">
          {isCapturing ? (
            <div className="relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full aspect-square object-cover rounded-xl"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button 
                  size="lg" 
                  className="rounded-full h-16 w-16 bg-white text-foreground shadow-lg"
                  onClick={capturePhoto}
                >
                  <Camera className="h-8 w-8" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full h-12 w-12 bg-white/80"
                  onClick={stopCamera}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative">
              {/* Frame Preview */}
              <div className={`p-3 rounded-2xl ${FRAME_STYLES.find(f => f.id === selectedFrame)?.borderClass}`}>
                <div className="bg-white p-1 rounded-xl">
                  <div 
                    ref={photoContainerRef}
                    className="relative w-full aspect-square rounded-lg overflow-hidden touch-none"
                    onMouseMove={handleDrag}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchMove={handleDrag}
                    onTouchEnd={handleDragEnd}
                  >
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="w-full h-full object-cover"
                    />
                    {/* Stickers overlay */}
                    {stickers.map((sticker) => (
                      <div
                        key={sticker.id}
                        className={`absolute cursor-move select-none transition-transform ${draggingId === sticker.id ? 'scale-110' : ''}`}
                        style={{
                          left: `${sticker.x}%`,
                          top: `${sticker.y}%`,
                          transform: `translate(-50%, -50%) scale(${sticker.scale})`,
                          fontSize: '2.5rem',
                        }}
                        onMouseDown={(e) => handleDragStart(sticker.id, e)}
                        onTouchStart={(e) => handleDragStart(sticker.id, e)}
                      >
                        {sticker.emoji}
                        <button
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => removeSticker(sticker.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {/* Text overlays */}
                    {texts.map((text) => (
                      <div
                        key={text.id}
                        className={`absolute cursor-move select-none font-bold text-lg transition-transform ${draggingId === text.id ? 'scale-110' : ''}`}
                        style={{
                          left: `${text.x}%`,
                          top: `${text.y}%`,
                          transform: 'translate(-50%, -50%)',
                          color: text.color,
                          textShadow: text.color === '#ffffff' ? '2px 2px 4px rgba(0,0,0,0.8)' : '2px 2px 4px rgba(255,255,255,0.8)',
                        }}
                        onMouseDown={(e) => handleDragStart(text.id, e)}
                        onTouchStart={(e) => handleDragStart(text.id, e)}
                      >
                        {text.text}
                        <button
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => removeText(text.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center py-3 text-white">
                  <p className="font-bold text-lg">{language === 'th' ? 'testD คนเทสต์ดีอยู่นี่จ้า' : 'testD — Good testers are right here!'}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <img src={swingLogo} alt="SWING" className="h-4" />
                    <span className="text-sm opacity-90">#SWINGThailand</span>
                  </div>
                </div>
              </div>
              <Button 
                size="icon" 
                variant="secondary"
                className="absolute top-2 right-2 rounded-full"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                {language === 'th' ? 'ถ่ายรูปหรืออัปโหลดรูปภาพ' : 'Take a photo or upload an image'}
              </p>
              <div className="flex gap-3">
                <Button onClick={startCamera} className="gap-2">
                  <Camera className="h-4 w-4" />
                  {language === 'th' ? 'ถ่ายรูป' : 'Camera'}
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {language === 'th' ? 'อัปโหลด' : 'Upload'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Hidden elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Editing Tools */}
        {capturedImage && (
          <div className="mb-6">
            {/* Tab buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeTab === 'frame' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('frame')}
                className="flex-1 gap-2"
              >
                <Image className="h-4 w-4" />
                {language === 'th' ? 'กรอบ' : 'Frame'}
              </Button>
              <Button
                variant={activeTab === 'stickers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('stickers')}
                className="flex-1 gap-2"
              >
                <Smile className="h-4 w-4" />
                {language === 'th' ? 'สติกเกอร์' : 'Stickers'}
              </Button>
              <Button
                variant={activeTab === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('text')}
                className="flex-1 gap-2"
              >
                <Type className="h-4 w-4" />
                {language === 'th' ? 'ข้อความ' : 'Text'}
              </Button>
            </div>

            {/* Frame Selection */}
            {activeTab === 'frame' && (
              <div className="flex gap-3">
                {FRAME_STYLES.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame.id)}
                    className={`flex-1 p-3 rounded-xl ${frame.borderClass} transition-all ${
                      selectedFrame === frame.id 
                        ? 'ring-2 ring-offset-2 ring-foreground scale-105' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="bg-white rounded-lg py-2 text-center">
                      <span className="text-xs font-medium text-foreground">
                        {language === 'th' ? frame.nameTh : frame.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Stickers Selection */}
            {activeTab === 'stickers' && (
              <div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  {language === 'th' ? 'แตะสติกเกอร์แล้วลากเพื่อย้าย' : 'Tap sticker then drag to move'}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => addSticker(sticker.emoji)}
                      className="aspect-square rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                    >
                      {sticker.emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text Input */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  {language === 'th' ? 'แตะข้อความแล้วลากเพื่อย้าย' : 'Tap text then drag to move'}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder={language === 'th' ? 'พิมพ์ข้อความ...' : 'Type text...'}
                    className="flex-1"
                    maxLength={30}
                  />
                  <Button onClick={addText} disabled={!newText.trim()}>
                    {language === 'th' ? 'เพิ่ม' : 'Add'}
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">
                    {language === 'th' ? 'สี:' : 'Color:'}
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedTextColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          selectedTextColor === color ? 'scale-125 border-foreground' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color, boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : undefined }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Buttons */}
        {capturedImage && (
          <div className="space-y-4">
            <Button 
              onClick={downloadImage} 
              variant="outline" 
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {language === 'th' ? 'ดาวน์โหลดรูป' : 'Download Image'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {language === 'th' ? 'แชร์ไปยัง' : 'Share to'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2 hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-500 hover:text-white hover:border-transparent transition-all"
                onClick={() => handleShare('instagram')}
              >
                <Instagram className="h-6 w-6" />
                <span className="text-xs">Instagram</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2 hover:bg-blue-600 hover:text-white hover:border-transparent transition-all"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-6 w-6" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-4 gap-2 hover:bg-black hover:text-white hover:border-transparent transition-all"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-6 w-6" />
                <span className="text-xs">X</span>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              {language === 'th' 
                ? '💡 ดาวน์โหลดรูปก่อน แล้วอัปโหลดไปยังโซเชียลมีเดีย' 
                : '💡 Download the image first, then upload to social media'}
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
