// HIV Self-Test Flow Types

export type Step = 'intro' | 'shipping' | 'nhso-verify' | 'account-success' | 'confirm-receipt' | 'video' | 'testing' | 'timer' | 'photo-result';

export interface SelfTestRequest {
  id: string;
  status: string;
  tracking_number: string | null;
  test_result: string | null;
  created_at: string;
  result_photo_url: string | null;
}

export interface ShippingFormData {
  fullName: string;
  phone: string;
  lineId: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  lastRiskDate: string;
}

export interface NHSOFormData {
  thaiId: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'transgender_male' | 'transgender_female' | 'non_binary' | 'prefer_not_to_say' | '';
}

export interface SavedUserData {
  thaiId?: string;
  dateOfBirth?: string;
  gender?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  province?: string;
}

// Gender options with Thai inclusive labels
export const GENDER_OPTIONS = [
  { value: 'male', labelTh: 'ชาย', labelEn: 'Male' },
  { value: 'female', labelTh: 'หญิง', labelEn: 'Female' },
  { value: 'transgender_male', labelTh: 'ชายข้ามเพศ', labelEn: 'Transgender Male' },
  { value: 'transgender_female', labelTh: 'หญิงข้ามเพศ', labelEn: 'Transgender Female' },
  { value: 'non_binary', labelTh: 'ไม่ระบุเพศ / นอนไบนารี', labelEn: 'Non-binary' },
  { value: 'prefer_not_to_say', labelTh: 'ไม่ต้องการระบุ', labelEn: 'Prefer not to say' },
];

// Thai ID validation using checksum algorithm
export const validateThaiId = (id: string): boolean => {
  if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
};

export const TESTING_STEPS = [
  { id: 'wash', th: 'ล้างมือให้สะอาดด้วยสบู่', en: 'Wash hands thoroughly with soap' },
  { id: 'open', th: 'เปิดกล่องและตรวจสอบอุปกรณ์ครบ', en: 'Open box and check all components' },
  { id: 'read', th: 'อ่านคำแนะนำในกล่องทั้งหมด', en: 'Read all instructions in the box' },
  { id: 'lancet', th: 'เตรียมนิ้วและใช้เข็มเจาะเลือด', en: 'Prepare finger and use lancet for blood' },
  { id: 'blood', th: 'หยดเลือดลงในช่องตัวอย่าง', en: 'Drop blood into sample well' },
  { id: 'buffer', th: 'หยดน้ำยา buffer ตามคำแนะนำ', en: 'Add buffer solution as instructed' },
];
