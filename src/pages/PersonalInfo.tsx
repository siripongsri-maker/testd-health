import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData, setUserData, PersonalInfo as PersonalInfoType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร",
  "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
  "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง",
  "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม",
  "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส",
  "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
  "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พังงา", "พัทลุง",
  "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่",
  "พะเยา", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
  "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง",
  "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย",
  "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี",
  "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย",
  "หนองบัวลำภู", "อ่างทอง", "อุดรธานี", "อุทัยธานี", "อุตรดิตถ์",
  "อุบลราชธานี", "อำนาจเจริญ"
];

export default function PersonalInfo() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [formData, setFormData] = useState<PersonalInfoType>({
    fullName: '',
    gender: '',
    birthDate: '',
    phone: '',
    lineId: '',
    address: '',
    province: '',
    postalCode: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const userData = getUserData();
    if (userData.personalInfo) {
      setFormData(userData.personalInfo);
    }
  }, []);

  const handleSave = () => {
    setUserData({ personalInfo: formData });
    setSaved(true);
    toast.success(language === 'th' ? 'บันทึกข้อมูลสำเร็จ!' : 'Information saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const genderOptions = [
    { value: 'male', labelTh: 'ชาย', labelEn: 'Male' },
    { value: 'female', labelTh: 'หญิง', labelEn: 'Female' },
    { value: 'other', labelTh: 'อื่นๆ', labelEn: 'Other' },
    { value: 'prefer-not-to-say', labelTh: 'ไม่ระบุ', labelEn: 'Prefer not to say' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-lg bg-background/80 border-b border-border/50 px-4 py-3 safe-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">
              {language === 'th' ? 'ข้อมูลส่วนตัว' : 'Personal Information'}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6 max-w-lg mx-auto">
        {/* Info card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            {language === 'th' 
              ? '🔒 ข้อมูลนี้จะถูกใช้กรอกฟอร์มอัตโนมัติเมื่อคุณขอรับบริการต่างๆ'
              : '🔒 This info will be used to auto-fill forms when you request services'}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">
              {language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder={language === 'th' ? 'กรอกชื่อ-นามสกุล' : 'Enter your full name'}
              className="bg-card"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>{language === 'th' ? 'เพศ' : 'Gender'}</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: PersonalInfoType['gender']) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={language === 'th' ? 'เลือกเพศ' : 'Select gender'} />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {language === 'th' ? opt.labelTh : opt.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate">
              {language === 'th' ? 'วันเกิด' : 'Birth Date'}
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="bg-card"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08x-xxx-xxxx"
              className="bg-card"
            />
          </div>

          {/* LINE ID */}
          <div className="space-y-2">
            <Label htmlFor="lineId">LINE ID</Label>
            <Input
              id="lineId"
              value={formData.lineId}
              onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
              placeholder={language === 'th' ? 'กรอก LINE ID' : 'Enter LINE ID'}
              className="bg-card"
            />
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label>{language === 'th' ? 'จังหวัด' : 'Province'}</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => setFormData({ ...formData, province: value })}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">
              {language === 'th' ? 'ที่อยู่' : 'Address'}
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={language === 'th' ? 'กรอกที่อยู่สำหรับจัดส่ง' : 'Enter delivery address'}
              className="bg-card min-h-[80px]"
            />
          </div>

          {/* Postal Code */}
          <div className="space-y-2">
            <Label htmlFor="postalCode">
              {language === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}
            </Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="xxxxx"
              maxLength={5}
              className="bg-card"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-12 text-base font-bold gap-2"
          disabled={saved}
        >
          {saved ? (
            <>
              <CheckCircle className="h-5 w-5" />
              {language === 'th' ? 'บันทึกแล้ว!' : 'Saved!'}
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              {language === 'th' ? 'บันทึกข้อมูล' : 'Save Information'}
            </>
          )}
        </Button>
      </main>
    </div>
  );
}