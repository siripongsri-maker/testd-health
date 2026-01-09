import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Upload, Share2, Instagram, Facebook, Twitter, Sparkles, Image, X } from "lucide-react";
import swingLogo from "@/assets/swing-logo.webp";

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

export default function ShareAchievements() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_STYLES[0].id);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    stopCamera();
  };

  const handleShare = async (platform: 'instagram' | 'facebook' | 'twitter') => {
    const message = language === 'th' 
      ? 'คนเทสต์ดีอยู่นี่จ้า 💪 #testD #SWINGThailand #SelfCare' 
      : "I'm taking care of my health! 💪 #testD #SWINGThailand #SelfCare";
    const encodedMessage = encodeURIComponent(message);

    // For sharing with image, we need to use Web Share API if available
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

    // Fallback to URL sharing
    const urls: Record<string, string> = {
      instagram: 'https://www.instagram.com/',
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const downloadImage = async () => {
    if (!capturedImage) return;
    
    // Create a decorated version with frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      const size = Math.max(img.width, img.height);
      const padding = 40;
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2 + 80; // Extra for branding

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

      // Draw branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('testD คนเทสต์ดีอยู่นี่จ้า', canvas.width / 2, canvas.height - 45);
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
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                </div>
                <div className="text-center py-3 text-white">
                  <p className="font-bold text-lg">testD คนเทสต์ดีอยู่นี่จ้า</p>
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

        {/* Frame Selection */}
        {capturedImage && (
          <div className="mb-6">
            <p className="text-sm font-medium mb-3 text-muted-foreground">
              {language === 'th' ? 'เลือกกรอบ' : 'Choose Frame'}
            </p>
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
