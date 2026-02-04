import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getUserData, setUserData, PersonalInfo as PersonalInfoType } from "@/lib/store";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

// Province to main postal code mapping
const PROVINCE_POSTAL_CODES: Record<string, string> = {
  "กรุงเทพมหานคร": "10100", "กระบี่": "81000", "กาญจนบุรี": "71000", "กาฬสินธุ์": "46000", "กำแพงเพชร": "62000",
  "ขอนแก่น": "40000", "จันทบุรี": "22000", "ฉะเชิงเทรา": "24000", "ชลบุรี": "20000", "ชัยนาท": "17000",
  "ชัยภูมิ": "36000", "ชุมพร": "86000", "เชียงราย": "57000", "เชียงใหม่": "50000", "ตรัง": "92000",
  "ตราด": "23000", "ตาก": "63000", "นครนายก": "26000", "นครปฐม": "73000", "นครพนม": "48000",
  "นครราชสีมา": "30000", "นครศรีธรรมราช": "80000", "นครสวรรค์": "60000", "นนทบุรี": "11000", "นราธิวาส": "96000",
  "น่าน": "55000", "บึงกาฬ": "38000", "บุรีรัมย์": "31000", "ปทุมธานี": "12000", "ประจวบคีรีขันธ์": "77000",
  "ปราจีนบุรี": "25000", "ปัตตานี": "94000", "พระนครศรีอยุธยา": "13000", "พังงา": "82000", "พัทลุง": "93000",
  "พิจิตร": "66000", "พิษณุโลก": "65000", "เพชรบุรี": "76000", "เพชรบูรณ์": "67000", "แพร่": "54000",
  "พะเยา": "56000", "ภูเก็ต": "83000", "มหาสารคาม": "44000", "มุกดาหาร": "49000", "แม่ฮ่องสอน": "58000",
  "ยโสธร": "35000", "ยะลา": "95000", "ร้อยเอ็ด": "45000", "ระนอง": "85000", "ระยอง": "21000",
  "ราชบุรี": "70000", "ลพบุรี": "15000", "ลำปาง": "52000", "ลำพูน": "51000", "เลย": "42000",
  "ศรีสะเกษ": "33000", "สกลนคร": "47000", "สงขลา": "90000", "สตูล": "91000", "สมุทรปราการ": "10270",
  "สมุทรสงคราม": "75000", "สมุทรสาคร": "74000", "สระแก้ว": "27000", "สระบุรี": "18000", "สิงห์บุรี": "16000",
  "สุโขทัย": "64000", "สุพรรณบุรี": "72000", "สุราษฎร์ธานี": "84000", "สุรินทร์": "32000", "หนองคาย": "43000",
  "หนองบัวลำภู": "39000", "อ่างทอง": "14000", "อุดรธานี": "41000", "อุทัยธานี": "61000", "อุตรดิตถ์": "53000",
  "อุบลราชธานี": "34000", "อำนาจเจริญ": "37000"
};

const PROVINCES = Object.keys(PROVINCE_POSTAL_CODES);

export default function PersonalInfo() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { trackProfileComplete } = useQuestProgress();
  const [formData, setFormData] = useState<PersonalInfoType>({
    fullName: '',
    gender: '',
    birthDate: '',
    phone: '',
    lineId: '',
    address: '',
    subdistrict: '',
    district: '',
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
    
    // Track profile complete quest if required fields are filled
    if (formData.fullName && formData.gender && formData.birthDate) {
      trackProfileComplete(language);
    }
    
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

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">
              {language === 'th' ? 'ที่อยู่ (บ้านเลขที่ ซอย ถนน)' : 'Address (House No., Street)'}
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={language === 'th' ? 'บ้านเลขที่ ซอย ถนน' : 'House number, street'}
              className="bg-card min-h-[60px]"
            />
          </div>

          {/* Subdistrict & District */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subdistrict">
                {language === 'th' ? 'แขวง/ตำบล' : 'Subdistrict'}
              </Label>
              <Input
                id="subdistrict"
                value={formData.subdistrict}
                onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                placeholder={language === 'th' ? 'แขวง/ตำบล' : 'Subdistrict'}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">
                {language === 'th' ? 'เขต/อำเภอ' : 'District'}
              </Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder={language === 'th' ? 'เขต/อำเภอ' : 'District'}
                className="bg-card"
              />
            </div>
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label>{language === 'th' ? 'จังหวัด' : 'Province'}</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => {
                const postalCode = PROVINCE_POSTAL_CODES[value] || formData.postalCode;
                setFormData({ ...formData, province: value, postalCode });
              }}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                {PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Postal Code */}
          <div className="space-y-2">
            <Label htmlFor="postalCode">
              {language === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}
              <a 
                href="https://www.thailandpost.co.th/un/zip" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-xs text-primary hover:underline"
              >
                🔍 {language === 'th' ? 'ค้นหา' : 'Lookup'}
              </a>
            </Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
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