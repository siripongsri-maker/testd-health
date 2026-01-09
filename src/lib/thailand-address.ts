// Thailand Address Data - Complete 77 Provinces with all Districts and Subdistricts
// Data sourced from thailand-geography-data (github.com/thailand-geography-data/thailand-geography-json)

import geographyData from '@/data/thailand-geography.json';

export interface Subdistrict {
  name: string;
  postalCode: string;
}

export interface District {
  name: string;
  subdistricts: Subdistrict[];
}

export interface Province {
  name: string;
  districts: District[];
}

// Raw data structure from the JSON
interface RawGeographyEntry {
  id: number;
  provinceCode: number;
  provinceNameEn: string;
  provinceNameTh: string;
  districtCode: number;
  districtNameEn: string;
  districtNameTh: string;
  subdistrictCode: number;
  subdistrictNameEn: string;
  subdistrictNameTh: string;
  postalCode: number;
}

// Transform flat data into hierarchical structure
function buildAddressData(): Province[] {
  const rawData = geographyData as RawGeographyEntry[];
  const provinceMap = new Map<string, Map<string, Subdistrict[]>>();
  
  for (const entry of rawData) {
    const provinceName = entry.provinceNameTh;
    const districtName = entry.districtNameTh;
    const subdistrict: Subdistrict = {
      name: entry.subdistrictNameTh,
      postalCode: String(entry.postalCode),
    };
    
    if (!provinceMap.has(provinceName)) {
      provinceMap.set(provinceName, new Map());
    }
    
    const districtMap = provinceMap.get(provinceName)!;
    if (!districtMap.has(districtName)) {
      districtMap.set(districtName, []);
    }
    
    districtMap.get(districtName)!.push(subdistrict);
  }
  
  // Convert maps to array structure
  const provinces: Province[] = [];
  
  for (const [provinceName, districtMap] of provinceMap) {
    const districts: District[] = [];
    
    for (const [districtName, subdistricts] of districtMap) {
      districts.push({
        name: districtName,
        subdistricts,
      });
    }
    
    provinces.push({
      name: provinceName,
      districts,
    });
  }
  
  // Sort provinces alphabetically by Thai name
  provinces.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  
  // Sort districts within each province
  for (const province of provinces) {
    province.districts.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    
    // Sort subdistricts within each district
    for (const district of province.districts) {
      district.subdistricts.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
  }
  
  return provinces;
}

// Build the address data once and cache it
export const THAILAND_ADDRESS_DATA: Province[] = buildAddressData();

// Helper functions
export function getProvinces(): string[] {
  return THAILAND_ADDRESS_DATA.map(p => p.name);
}

export function getDistricts(provinceName: string): string[] {
  const province = THAILAND_ADDRESS_DATA.find(p => p.name === provinceName);
  return province ? province.districts.map(d => d.name) : [];
}

export function getSubdistricts(provinceName: string, districtName: string): Subdistrict[] {
  const province = THAILAND_ADDRESS_DATA.find(p => p.name === provinceName);
  if (!province) return [];
  
  const district = province.districts.find(d => d.name === districtName);
  return district ? district.subdistricts : [];
}

export function getPostalCode(provinceName: string, districtName: string, subdistrictName: string): string {
  const subdistricts = getSubdistricts(provinceName, districtName);
  const subdistrict = subdistricts.find(s => s.name === subdistrictName);
  return subdistrict?.postalCode || '';
}
