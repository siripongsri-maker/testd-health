// Thailand address data: Province → District → Subdistrict → Postal Code
// This is a subset covering major areas. For complete data, integrate with Thai postal API.

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

export const THAILAND_ADDRESS_DATA: Province[] = [
  {
    name: "กรุงเทพมหานคร",
    districts: [
      {
        name: "พระนคร",
        subdistricts: [
          { name: "พระบรมมหาราชวัง", postalCode: "10200" },
          { name: "วังบูรพาภิรมย์", postalCode: "10200" },
          { name: "วัดราชบพิธ", postalCode: "10200" },
          { name: "สำราญราษฎร์", postalCode: "10200" },
          { name: "ศาลเจ้าพ่อเสือ", postalCode: "10200" },
          { name: "เสาชิงช้า", postalCode: "10200" },
          { name: "บวรนิเวศ", postalCode: "10200" },
          { name: "ตลาดยอด", postalCode: "10200" },
          { name: "ชนะสงคราม", postalCode: "10200" },
          { name: "บ้านพานถม", postalCode: "10200" },
          { name: "บางขุนพรหม", postalCode: "10200" },
          { name: "วัดสามพระยา", postalCode: "10200" }
        ]
      },
      {
        name: "ดุสิต",
        subdistricts: [
          { name: "ดุสิต", postalCode: "10300" },
          { name: "วชิรพยาบาล", postalCode: "10300" },
          { name: "สวนจิตรลดา", postalCode: "10300" },
          { name: "สี่แยกมหานาค", postalCode: "10300" },
          { name: "ถนนนครไชยศรี", postalCode: "10300" }
        ]
      },
      {
        name: "หนองจอก",
        subdistricts: [
          { name: "กระทุ่มราย", postalCode: "10530" },
          { name: "หนองจอก", postalCode: "10530" },
          { name: "คลองสิบ", postalCode: "10530" },
          { name: "คลองสิบสอง", postalCode: "10530" },
          { name: "โคกแฝด", postalCode: "10530" },
          { name: "คู้ฝั่งเหนือ", postalCode: "10530" },
          { name: "ลำผักชี", postalCode: "10530" },
          { name: "ลำต้อยติ่ง", postalCode: "10530" }
        ]
      },
      {
        name: "บางรัก",
        subdistricts: [
          { name: "มหาพฤฒาราม", postalCode: "10500" },
          { name: "สีลม", postalCode: "10500" },
          { name: "สุริยวงศ์", postalCode: "10500" },
          { name: "บางรัก", postalCode: "10500" },
          { name: "สี่พระยา", postalCode: "10500" }
        ]
      },
      {
        name: "บางเขน",
        subdistricts: [
          { name: "อนุสาวรีย์", postalCode: "10220" },
          { name: "ท่าแร้ง", postalCode: "10220" }
        ]
      },
      {
        name: "บางกะปิ",
        subdistricts: [
          { name: "คลองจั่น", postalCode: "10240" },
          { name: "หัวหมาก", postalCode: "10240" }
        ]
      },
      {
        name: "ปทุมวัน",
        subdistricts: [
          { name: "รองเมือง", postalCode: "10330" },
          { name: "วังใหม่", postalCode: "10330" },
          { name: "ปทุมวัน", postalCode: "10330" },
          { name: "ลุมพินี", postalCode: "10330" }
        ]
      },
      {
        name: "ป้อมปราบศัตรูพ่าย",
        subdistricts: [
          { name: "ป้อมปราบ", postalCode: "10100" },
          { name: "วัดเทพศิรินทร์", postalCode: "10100" },
          { name: "คลองมหานาค", postalCode: "10100" },
          { name: "บ้านบาตร", postalCode: "10100" },
          { name: "วัดโสมนัส", postalCode: "10100" }
        ]
      },
      {
        name: "พระโขนง",
        subdistricts: [
          { name: "บางจาก", postalCode: "10260" }
        ]
      },
      {
        name: "มีนบุรี",
        subdistricts: [
          { name: "มีนบุรี", postalCode: "10510" },
          { name: "แสนแสบ", postalCode: "10510" }
        ]
      },
      {
        name: "ลาดกระบัง",
        subdistricts: [
          { name: "ลาดกระบัง", postalCode: "10520" },
          { name: "คลองสองต้นนุ่น", postalCode: "10520" },
          { name: "คลองสามประเวศ", postalCode: "10520" },
          { name: "ลำปลาทิว", postalCode: "10520" },
          { name: "ทับยาว", postalCode: "10520" },
          { name: "ขุมทอง", postalCode: "10520" }
        ]
      },
      {
        name: "ยานนาวา",
        subdistricts: [
          { name: "ช่องนนทรี", postalCode: "10120" },
          { name: "บางโพงพาง", postalCode: "10120" }
        ]
      },
      {
        name: "สัมพันธวงศ์",
        subdistricts: [
          { name: "จักรวรรดิ", postalCode: "10100" },
          { name: "สัมพันธวงศ์", postalCode: "10100" },
          { name: "ตลาดน้อย", postalCode: "10100" }
        ]
      },
      {
        name: "พญาไท",
        subdistricts: [
          { name: "สามเสนใน", postalCode: "10400" },
          { name: "พญาไท", postalCode: "10400" }
        ]
      },
      {
        name: "ธนบุรี",
        subdistricts: [
          { name: "วัดกัลยาณ์", postalCode: "10600" },
          { name: "หิรัญรูจี", postalCode: "10600" },
          { name: "บางยี่เรือ", postalCode: "10600" },
          { name: "บุคคโล", postalCode: "10600" },
          { name: "ตลาดพลู", postalCode: "10600" },
          { name: "ดาวคะนอง", postalCode: "10600" },
          { name: "สำเหร่", postalCode: "10600" }
        ]
      },
      {
        name: "บางกอกใหญ่",
        subdistricts: [
          { name: "วัดอรุณ", postalCode: "10600" },
          { name: "วัดท่าพระ", postalCode: "10600" }
        ]
      },
      {
        name: "ห้วยขวาง",
        subdistricts: [
          { name: "ห้วยขวาง", postalCode: "10310" },
          { name: "บางกะปิ", postalCode: "10310" },
          { name: "สามเสนนอก", postalCode: "10310" }
        ]
      },
      {
        name: "คลองสาน",
        subdistricts: [
          { name: "สมเด็จเจ้าพระยา", postalCode: "10600" },
          { name: "คลองสาน", postalCode: "10600" },
          { name: "บางลำภูล่าง", postalCode: "10600" },
          { name: "คลองต้นไทร", postalCode: "10600" }
        ]
      },
      {
        name: "ตลิ่งชัน",
        subdistricts: [
          { name: "คลองชักพระ", postalCode: "10170" },
          { name: "ตลิ่งชัน", postalCode: "10170" },
          { name: "ฉิมพลี", postalCode: "10170" },
          { name: "บางพรม", postalCode: "10170" },
          { name: "บางระมาด", postalCode: "10170" },
          { name: "บางเชือกหนัง", postalCode: "10170" }
        ]
      },
      {
        name: "บางกอกน้อย",
        subdistricts: [
          { name: "ศิริราช", postalCode: "10700" },
          { name: "บ้านช่างหล่อ", postalCode: "10700" },
          { name: "บางขุนนนท์", postalCode: "10700" },
          { name: "บางขุนศรี", postalCode: "10700" },
          { name: "อรุณอมรินทร์", postalCode: "10700" }
        ]
      },
      {
        name: "บางขุนเทียน",
        subdistricts: [
          { name: "ท่าข้าม", postalCode: "10150" },
          { name: "แสมดำ", postalCode: "10150" }
        ]
      },
      {
        name: "ภาษีเจริญ",
        subdistricts: [
          { name: "บางหว้า", postalCode: "10160" },
          { name: "บางด้วน", postalCode: "10160" },
          { name: "บางจาก", postalCode: "10160" },
          { name: "บางแวก", postalCode: "10160" },
          { name: "คลองขวาง", postalCode: "10160" },
          { name: "ปากคลองภาษีเจริญ", postalCode: "10160" },
          { name: "คูหาสวรรค์", postalCode: "10160" }
        ]
      },
      {
        name: "หนองแขม",
        subdistricts: [
          { name: "หนองแขม", postalCode: "10160" },
          { name: "หนองค้างพลู", postalCode: "10160" }
        ]
      },
      {
        name: "ราษฎร์บูรณะ",
        subdistricts: [
          { name: "ราษฎร์บูรณะ", postalCode: "10140" },
          { name: "บางปะกอก", postalCode: "10140" }
        ]
      },
      {
        name: "บางพลัด",
        subdistricts: [
          { name: "บางพลัด", postalCode: "10700" },
          { name: "บางอ้อ", postalCode: "10700" },
          { name: "บางบำหรุ", postalCode: "10700" },
          { name: "บางยี่ขัน", postalCode: "10700" }
        ]
      },
      {
        name: "ดินแดง",
        subdistricts: [
          { name: "ดินแดง", postalCode: "10400" }
        ]
      },
      {
        name: "บึงกุ่ม",
        subdistricts: [
          { name: "คลองกุ่ม", postalCode: "10230" },
          { name: "นวมินทร์", postalCode: "10230" },
          { name: "นวลจันทร์", postalCode: "10230" }
        ]
      },
      {
        name: "สาทร",
        subdistricts: [
          { name: "ทุ่งวัดดอน", postalCode: "10120" },
          { name: "ยานนาวา", postalCode: "10120" },
          { name: "ทุ่งมหาเมฆ", postalCode: "10120" }
        ]
      },
      {
        name: "บางซื่อ",
        subdistricts: [
          { name: "บางซื่อ", postalCode: "10800" },
          { name: "วงศ์สว่าง", postalCode: "10800" }
        ]
      },
      {
        name: "จตุจักร",
        subdistricts: [
          { name: "ลาดยาว", postalCode: "10900" },
          { name: "เสนานิคม", postalCode: "10900" },
          { name: "จันทรเกษม", postalCode: "10900" },
          { name: "จอมพล", postalCode: "10900" },
          { name: "จตุจักร", postalCode: "10900" }
        ]
      },
      {
        name: "บางคอแหลม",
        subdistricts: [
          { name: "บางคอแหลม", postalCode: "10120" },
          { name: "วัดพระยาไกร", postalCode: "10120" },
          { name: "บางโคล่", postalCode: "10120" }
        ]
      },
      {
        name: "ประเวศ",
        subdistricts: [
          { name: "ประเวศ", postalCode: "10250" },
          { name: "หนองบอน", postalCode: "10250" },
          { name: "ดอกไม้", postalCode: "10250" },
          { name: "สวนหลวง", postalCode: "10250" }
        ]
      },
      {
        name: "คลองเตย",
        subdistricts: [
          { name: "คลองเตย", postalCode: "10110" },
          { name: "คลองตัน", postalCode: "10110" },
          { name: "พระโขนง", postalCode: "10110" },
          { name: "คลองเตยเหนือ", postalCode: "10110" }
        ]
      },
      {
        name: "สวนหลวง",
        subdistricts: [
          { name: "สวนหลวง", postalCode: "10250" },
          { name: "อ่อนนุช", postalCode: "10250" },
          { name: "พัฒนาการ", postalCode: "10250" }
        ]
      },
      {
        name: "จอมทอง",
        subdistricts: [
          { name: "บางขุนเทียน", postalCode: "10150" },
          { name: "บางค้อ", postalCode: "10150" },
          { name: "บางมด", postalCode: "10150" },
          { name: "จอมทอง", postalCode: "10150" }
        ]
      },
      {
        name: "ดอนเมือง",
        subdistricts: [
          { name: "สีกัน", postalCode: "10210" },
          { name: "ดอนเมือง", postalCode: "10210" },
          { name: "สนามบิน", postalCode: "10210" }
        ]
      },
      {
        name: "ราชเทวี",
        subdistricts: [
          { name: "ทุ่งพญาไท", postalCode: "10400" },
          { name: "ถนนพญาไท", postalCode: "10400" },
          { name: "ถนนเพชรบุรี", postalCode: "10400" },
          { name: "มักกะสัน", postalCode: "10400" }
        ]
      },
      {
        name: "ลาดพร้าว",
        subdistricts: [
          { name: "ลาดพร้าว", postalCode: "10230" },
          { name: "จรเข้บัว", postalCode: "10230" }
        ]
      },
      {
        name: "วัฒนา",
        subdistricts: [
          { name: "คลองเตยเหนือ", postalCode: "10110" },
          { name: "คลองตันเหนือ", postalCode: "10110" },
          { name: "พระโขนงเหนือ", postalCode: "10110" }
        ]
      },
      {
        name: "บางแค",
        subdistricts: [
          { name: "บางแค", postalCode: "10160" },
          { name: "บางแคเหนือ", postalCode: "10160" },
          { name: "บางไผ่", postalCode: "10160" },
          { name: "หลักสอง", postalCode: "10160" }
        ]
      },
      {
        name: "หลักสี่",
        subdistricts: [
          { name: "ทุ่งสองห้อง", postalCode: "10210" },
          { name: "ตลาดบางเขน", postalCode: "10210" }
        ]
      },
      {
        name: "สายไหม",
        subdistricts: [
          { name: "สายไหม", postalCode: "10220" },
          { name: "ออเงิน", postalCode: "10220" },
          { name: "คลองถนน", postalCode: "10220" }
        ]
      },
      {
        name: "คันนายาว",
        subdistricts: [
          { name: "คันนายาว", postalCode: "10230" },
          { name: "รามอินทรา", postalCode: "10230" }
        ]
      },
      {
        name: "สะพานสูง",
        subdistricts: [
          { name: "สะพานสูง", postalCode: "10240" },
          { name: "ราษฎร์พัฒนา", postalCode: "10240" },
          { name: "ทับช้าง", postalCode: "10250" }
        ]
      },
      {
        name: "วังทองหลาง",
        subdistricts: [
          { name: "วังทองหลาง", postalCode: "10310" },
          { name: "สะพานสอง", postalCode: "10310" },
          { name: "คลองเจ้าคุณสิงห์", postalCode: "10310" },
          { name: "พลับพลา", postalCode: "10310" }
        ]
      },
      {
        name: "คลองสามวา",
        subdistricts: [
          { name: "สามวาตะวันตก", postalCode: "10510" },
          { name: "สามวาตะวันออก", postalCode: "10510" },
          { name: "บางชัน", postalCode: "10510" },
          { name: "ทรายกองดิน", postalCode: "10510" },
          { name: "ทรายกองดินใต้", postalCode: "10510" }
        ]
      },
      {
        name: "บางนา",
        subdistricts: [
          { name: "บางนา", postalCode: "10260" }
        ]
      },
      {
        name: "ทวีวัฒนา",
        subdistricts: [
          { name: "ทวีวัฒนา", postalCode: "10170" },
          { name: "ศาลาธรรมสพน์", postalCode: "10170" }
        ]
      },
      {
        name: "ทุ่งครุ",
        subdistricts: [
          { name: "บางมด", postalCode: "10140" },
          { name: "ทุ่งครุ", postalCode: "10140" }
        ]
      },
      {
        name: "บางบอน",
        subdistricts: [
          { name: "บางบอน", postalCode: "10150" },
          { name: "บางบอนเหนือ", postalCode: "10150" },
          { name: "บางบอนใต้", postalCode: "10150" },
          { name: "คลองบางพราน", postalCode: "10150" },
          { name: "คลองบางบอน", postalCode: "10150" }
        ]
      }
    ]
  },
  {
    name: "เชียงใหม่",
    districts: [
      {
        name: "เมืองเชียงใหม่",
        subdistricts: [
          { name: "ศรีภูมิ", postalCode: "50200" },
          { name: "พระสิงห์", postalCode: "50200" },
          { name: "หายยา", postalCode: "50100" },
          { name: "ช้างม่อย", postalCode: "50300" },
          { name: "ช้างคลาน", postalCode: "50100" },
          { name: "วัดเกต", postalCode: "50000" },
          { name: "ช้างเผือก", postalCode: "50300" },
          { name: "สุเทพ", postalCode: "50200" },
          { name: "แม่เหียะ", postalCode: "50100" },
          { name: "ป่าแดด", postalCode: "50100" },
          { name: "หนองหอย", postalCode: "50000" },
          { name: "ท่าศาลา", postalCode: "50000" },
          { name: "หนองป่าครั่ง", postalCode: "50000" },
          { name: "ฟ้าฮ่าม", postalCode: "50000" },
          { name: "ป่าตัน", postalCode: "50300" },
          { name: "สันผีเสื้อ", postalCode: "50300" }
        ]
      },
      {
        name: "จอมทอง",
        subdistricts: [
          { name: "บ้านหลวง", postalCode: "50160" },
          { name: "ข่วงเปา", postalCode: "50160" },
          { name: "สบเตี๊ยะ", postalCode: "50160" },
          { name: "บ้านแปะ", postalCode: "50240" },
          { name: "ดอยแก้ว", postalCode: "50160" },
          { name: "แม่สอย", postalCode: "50240" }
        ]
      },
      {
        name: "แม่แจ่ม",
        subdistricts: [
          { name: "ช่างเคิ่ง", postalCode: "50270" },
          { name: "ท่าผา", postalCode: "50270" },
          { name: "บ้านทับ", postalCode: "50270" },
          { name: "แม่ศึก", postalCode: "50270" },
          { name: "แม่นาจร", postalCode: "50270" },
          { name: "ปางหินฝน", postalCode: "50270" },
          { name: "กองแขก", postalCode: "50270" }
        ]
      },
      {
        name: "เชียงดาว",
        subdistricts: [
          { name: "เชียงดาว", postalCode: "50170" },
          { name: "เมืองนะ", postalCode: "50170" },
          { name: "เมืองงาย", postalCode: "50170" },
          { name: "แม่นะ", postalCode: "50170" },
          { name: "เมืองคอง", postalCode: "50170" },
          { name: "ปิงโค้ง", postalCode: "50170" },
          { name: "ทุ่งข้าวพวง", postalCode: "50170" }
        ]
      },
      {
        name: "ดอยสะเก็ด",
        subdistricts: [
          { name: "เชิงดอย", postalCode: "50220" },
          { name: "สันปูเลย", postalCode: "50220" },
          { name: "ลวงเหนือ", postalCode: "50220" },
          { name: "ป่าป้อง", postalCode: "50220" },
          { name: "สง่าบ้าน", postalCode: "50220" },
          { name: "ป่าลาน", postalCode: "50220" },
          { name: "ตลาดขวัญ", postalCode: "50220" },
          { name: "สำราญราษฎร์", postalCode: "50220" },
          { name: "แม่คือ", postalCode: "50220" },
          { name: "ตลาดใหญ่", postalCode: "50220" },
          { name: "แม่ฮ้อยเงิน", postalCode: "50220" },
          { name: "แม่โป่ง", postalCode: "50220" },
          { name: "ป่าเมี่ยง", postalCode: "50220" },
          { name: "เทพเสด็จ", postalCode: "50220" }
        ]
      }
    ]
  },
  {
    name: "ชลบุรี",
    districts: [
      {
        name: "เมืองชลบุรี",
        subdistricts: [
          { name: "บางปลาสร้อย", postalCode: "20000" },
          { name: "มะขามหย่ง", postalCode: "20000" },
          { name: "บ้านโขด", postalCode: "20000" },
          { name: "แสนสุข", postalCode: "20130" },
          { name: "บ้านสวน", postalCode: "20000" },
          { name: "หนองรี", postalCode: "20000" },
          { name: "นาป่า", postalCode: "20000" },
          { name: "หนองข้างคอก", postalCode: "20000" },
          { name: "บางทราย", postalCode: "20000" },
          { name: "คลองตำหรุ", postalCode: "20000" },
          { name: "เหมือง", postalCode: "20130" },
          { name: "บ้านปึก", postalCode: "20130" },
          { name: "ห้วยกะปิ", postalCode: "20000" },
          { name: "เสม็ด", postalCode: "20000" },
          { name: "อ่างศิลา", postalCode: "20000" },
          { name: "สำนักบก", postalCode: "20000" },
          { name: "หนองไม้แดง", postalCode: "20000" },
          { name: "ดอนหัวฬ่อ", postalCode: "20000" }
        ]
      },
      {
        name: "บางละมุง",
        subdistricts: [
          { name: "บางละมุง", postalCode: "20150" },
          { name: "หนองปรือ", postalCode: "20150" },
          { name: "หนองปลาไหล", postalCode: "20150" },
          { name: "โป่ง", postalCode: "20150" },
          { name: "เขาไม้แก้ว", postalCode: "20150" },
          { name: "ห้วยใหญ่", postalCode: "20150" },
          { name: "ตะเคียนเตี้ย", postalCode: "20150" },
          { name: "นาเกลือ", postalCode: "20150" }
        ]
      },
      {
        name: "พานทอง",
        subdistricts: [
          { name: "พานทอง", postalCode: "20160" },
          { name: "หนองตำลึง", postalCode: "20160" },
          { name: "มาบโป่ง", postalCode: "20160" },
          { name: "หนองกะขะ", postalCode: "20160" },
          { name: "หนองหงษ์", postalCode: "20160" },
          { name: "โคกขี้หนอน", postalCode: "20160" },
          { name: "บ้านเก่า", postalCode: "20160" },
          { name: "หน้าประดู่", postalCode: "20160" },
          { name: "บางนาง", postalCode: "20160" },
          { name: "เกาะลอย", postalCode: "20160" },
          { name: "บางหัก", postalCode: "20160" }
        ]
      },
      {
        name: "พัทยา",
        subdistricts: [
          { name: "พัทยา", postalCode: "20150" }
        ]
      },
      {
        name: "ศรีราชา",
        subdistricts: [
          { name: "ศรีราชา", postalCode: "20110" },
          { name: "สุรศักดิ์", postalCode: "20110" },
          { name: "ทุ่งสุขลา", postalCode: "20230" },
          { name: "บึง", postalCode: "20230" },
          { name: "หนองขาม", postalCode: "20110" },
          { name: "เขาคันทรง", postalCode: "20110" },
          { name: "บางพระ", postalCode: "20110" },
          { name: "บ่อวิน", postalCode: "20230" }
        ]
      }
    ]
  },
  {
    name: "นนทบุรี",
    districts: [
      {
        name: "เมืองนนทบุรี",
        subdistricts: [
          { name: "สวนใหญ่", postalCode: "11000" },
          { name: "ตลาดขวัญ", postalCode: "11000" },
          { name: "บางเขน", postalCode: "11000" },
          { name: "บางกระสอ", postalCode: "11000" },
          { name: "ท่าทราย", postalCode: "11000" },
          { name: "บางไผ่", postalCode: "11000" },
          { name: "บางศรีเมือง", postalCode: "11000" },
          { name: "บางกร่าง", postalCode: "11000" },
          { name: "ไทรม้า", postalCode: "11000" },
          { name: "บางรักน้อย", postalCode: "11000" }
        ]
      },
      {
        name: "บางกรวย",
        subdistricts: [
          { name: "วัดชลอ", postalCode: "11130" },
          { name: "บางกรวย", postalCode: "11130" },
          { name: "บางสีทอง", postalCode: "11130" },
          { name: "บางขนุน", postalCode: "11130" },
          { name: "บางขุนกอง", postalCode: "11130" },
          { name: "บางคูเวียง", postalCode: "11130" },
          { name: "มหาสวัสดิ์", postalCode: "11130" },
          { name: "ปลายบาง", postalCode: "11130" },
          { name: "ศาลากลาง", postalCode: "11130" }
        ]
      },
      {
        name: "บางใหญ่",
        subdistricts: [
          { name: "บางใหญ่", postalCode: "11140" },
          { name: "เสาธงหิน", postalCode: "11140" },
          { name: "บางม่วง", postalCode: "11140" },
          { name: "บ้านใหม่", postalCode: "11140" },
          { name: "บางแม่นาง", postalCode: "11140" },
          { name: "บางเลน", postalCode: "11140" }
        ]
      },
      {
        name: "บางบัวทอง",
        subdistricts: [
          { name: "โสนลอย", postalCode: "11110" },
          { name: "บางบัวทอง", postalCode: "11110" },
          { name: "บางรักใหญ่", postalCode: "11110" },
          { name: "บางคูรัด", postalCode: "11110" },
          { name: "ละหาร", postalCode: "11110" },
          { name: "ลำโพ", postalCode: "11110" },
          { name: "พิมลราช", postalCode: "11110" },
          { name: "บางรักพัฒนา", postalCode: "11110" }
        ]
      },
      {
        name: "ปากเกร็ด",
        subdistricts: [
          { name: "ปากเกร็ด", postalCode: "11120" },
          { name: "บางตลาด", postalCode: "11120" },
          { name: "บ้านใหม่", postalCode: "11120" },
          { name: "บางพูด", postalCode: "11120" },
          { name: "บางตะไนย์", postalCode: "11120" },
          { name: "คลองเกลือ", postalCode: "11120" },
          { name: "ท่าอิฐ", postalCode: "11120" },
          { name: "เกาะเกร็ด", postalCode: "11120" },
          { name: "อ้อมเกร็ด", postalCode: "11120" },
          { name: "คลองข่อย", postalCode: "11120" },
          { name: "บางพลับ", postalCode: "11120" },
          { name: "คลองพระอุดม", postalCode: "11120" }
        ]
      },
      {
        name: "ไทรน้อย",
        subdistricts: [
          { name: "ไทรน้อย", postalCode: "11150" },
          { name: "ราษฎร์นิยม", postalCode: "11150" },
          { name: "หนองเพรางาย", postalCode: "11150" },
          { name: "ไทรใหญ่", postalCode: "11150" },
          { name: "ขุนศรี", postalCode: "11150" },
          { name: "คลองขวาง", postalCode: "11150" },
          { name: "ทวีวัฒนา", postalCode: "11150" }
        ]
      }
    ]
  },
  {
    name: "ปทุมธานี",
    districts: [
      {
        name: "เมืองปทุมธานี",
        subdistricts: [
          { name: "บางปรอก", postalCode: "12000" },
          { name: "บ้านใหม่", postalCode: "12000" },
          { name: "บ้านกลาง", postalCode: "12000" },
          { name: "บ้านฉาง", postalCode: "12000" },
          { name: "บ้านกระแชง", postalCode: "12000" },
          { name: "บางขะแยง", postalCode: "12000" },
          { name: "บางคูวัด", postalCode: "12000" },
          { name: "บางหลวง", postalCode: "12000" },
          { name: "บางเดื่อ", postalCode: "12000" },
          { name: "บางพูด", postalCode: "12000" },
          { name: "บางพูน", postalCode: "12000" },
          { name: "หลักหก", postalCode: "12000" },
          { name: "สวนพริกไทย", postalCode: "12000" }
        ]
      },
      {
        name: "คลองหลวง",
        subdistricts: [
          { name: "คลองหนึ่ง", postalCode: "12120" },
          { name: "คลองสอง", postalCode: "12120" },
          { name: "คลองสาม", postalCode: "12120" },
          { name: "คลองสี่", postalCode: "12120" },
          { name: "คลองห้า", postalCode: "12120" },
          { name: "คลองหก", postalCode: "12120" },
          { name: "คลองเจ็ด", postalCode: "12120" }
        ]
      },
      {
        name: "ธัญบุรี",
        subdistricts: [
          { name: "ประชาธิปัตย์", postalCode: "12130" },
          { name: "บึงยี่โถ", postalCode: "12130" },
          { name: "รังสิต", postalCode: "12110" },
          { name: "ลำผักกูด", postalCode: "12110" },
          { name: "บึงสนั่น", postalCode: "12110" },
          { name: "บึงน้ำรักษ์", postalCode: "12110" }
        ]
      },
      {
        name: "ลำลูกกา",
        subdistricts: [
          { name: "คูคต", postalCode: "12130" },
          { name: "ลาดสวาย", postalCode: "12150" },
          { name: "บึงคำพร้อย", postalCode: "12150" },
          { name: "ลำลูกกา", postalCode: "12150" },
          { name: "บึงทองหลาง", postalCode: "12150" },
          { name: "ลำไทร", postalCode: "12150" },
          { name: "บึงคอไห", postalCode: "12150" },
          { name: "พืชอุดม", postalCode: "12150" }
        ]
      },
      {
        name: "หนองเสือ",
        subdistricts: [
          { name: "บึงบา", postalCode: "12170" },
          { name: "บึงบอน", postalCode: "12170" },
          { name: "บึงกาสาม", postalCode: "12170" },
          { name: "นพรัตน์", postalCode: "12170" },
          { name: "หนองสามวัง", postalCode: "12170" },
          { name: "ศาลาครุ", postalCode: "12170" },
          { name: "บึงชำอ้อ", postalCode: "12170" }
        ]
      },
      {
        name: "สามโคก",
        subdistricts: [
          { name: "บางเตย", postalCode: "12160" },
          { name: "คลองควาย", postalCode: "12160" },
          { name: "กระแชง", postalCode: "12160" },
          { name: "บางโพธิ์เหนือ", postalCode: "12160" },
          { name: "เชียงรากใหญ่", postalCode: "12160" },
          { name: "บ้านงิ้ว", postalCode: "12160" },
          { name: "เชียงรากน้อย", postalCode: "12160" },
          { name: "บ้านปทุม", postalCode: "12160" },
          { name: "บางกระบือ", postalCode: "12160" },
          { name: "ท้ายเกาะ", postalCode: "12160" },
          { name: "สามโคก", postalCode: "12160" }
        ]
      },
      {
        name: "ลาดหลุมแก้ว",
        subdistricts: [
          { name: "ระแหง", postalCode: "12140" },
          { name: "ลาดหลุมแก้ว", postalCode: "12140" },
          { name: "คูบางหลวง", postalCode: "12140" },
          { name: "คูขวาง", postalCode: "12140" },
          { name: "คลองพระอุดม", postalCode: "12140" },
          { name: "บ่อเงิน", postalCode: "12140" },
          { name: "หน้าไม้", postalCode: "12140" }
        ]
      }
    ]
  },
  {
    name: "สมุทรปราการ",
    districts: [
      {
        name: "เมืองสมุทรปราการ",
        subdistricts: [
          { name: "ปากน้ำ", postalCode: "10270" },
          { name: "สำโรงเหนือ", postalCode: "10270" },
          { name: "บางเมือง", postalCode: "10270" },
          { name: "ท้ายบ้าน", postalCode: "10280" },
          { name: "บางปูใหม่", postalCode: "10280" },
          { name: "แพรกษา", postalCode: "10280" },
          { name: "บางโปรง", postalCode: "10270" },
          { name: "บางปู", postalCode: "10280" },
          { name: "บางด้วน", postalCode: "10270" },
          { name: "บางเมืองใหม่", postalCode: "10270" },
          { name: "เทพารักษ์", postalCode: "10270" },
          { name: "ท้ายบ้านใหม่", postalCode: "10280" },
          { name: "แพรกษาใหม่", postalCode: "10280" }
        ]
      },
      {
        name: "บางบ่อ",
        subdistricts: [
          { name: "บางบ่อ", postalCode: "10560" },
          { name: "บ้านระกาศ", postalCode: "10560" },
          { name: "บางพลีน้อย", postalCode: "10560" },
          { name: "บางเพรียง", postalCode: "10560" },
          { name: "คลองด่าน", postalCode: "10550" },
          { name: "คลองสวน", postalCode: "10560" },
          { name: "เปร็ง", postalCode: "10560" },
          { name: "คลองนิยมยาตรา", postalCode: "10560" }
        ]
      },
      {
        name: "บางพลี",
        subdistricts: [
          { name: "บางพลีใหญ่", postalCode: "10540" },
          { name: "บางแก้ว", postalCode: "10540" },
          { name: "บางปลา", postalCode: "10540" },
          { name: "บางโฉลง", postalCode: "10540" },
          { name: "ราชาเทวะ", postalCode: "10540" },
          { name: "หนองปรือ", postalCode: "10540" }
        ]
      },
      {
        name: "พระประแดง",
        subdistricts: [
          { name: "ตลาด", postalCode: "10130" },
          { name: "บางพึ่ง", postalCode: "10130" },
          { name: "บางจาก", postalCode: "10130" },
          { name: "บางครุ", postalCode: "10130" },
          { name: "บางหญ้าแพรก", postalCode: "10130" },
          { name: "บางหัวเสือ", postalCode: "10130" },
          { name: "สำโรง", postalCode: "10130" },
          { name: "สำโรงกลาง", postalCode: "10130" },
          { name: "บางยอ", postalCode: "10130" },
          { name: "บางกะเจ้า", postalCode: "10130" },
          { name: "บางน้ำผึ้ง", postalCode: "10130" },
          { name: "บางกระสอบ", postalCode: "10130" },
          { name: "บางกอบัว", postalCode: "10130" },
          { name: "ทรงคนอง", postalCode: "10130" },
          { name: "สำโรงใต้", postalCode: "10130" }
        ]
      },
      {
        name: "พระสมุทรเจดีย์",
        subdistricts: [
          { name: "นาเกลือ", postalCode: "10290" },
          { name: "บ้านคลองสวน", postalCode: "10290" },
          { name: "แหลมฟ้าผ่า", postalCode: "10290" },
          { name: "ปากคลองบางปลากด", postalCode: "10290" },
          { name: "ในคลองบางปลากด", postalCode: "10290" }
        ]
      },
      {
        name: "บางเสาธง",
        subdistricts: [
          { name: "บางเสาธง", postalCode: "10570" },
          { name: "ศีรษะจรเข้น้อย", postalCode: "10570" },
          { name: "ศีรษะจรเข้ใหญ่", postalCode: "10570" }
        ]
      }
    ]
  },
  {
    name: "ภูเก็ต",
    districts: [
      {
        name: "เมืองภูเก็ต",
        subdistricts: [
          { name: "ตลาดใหญ่", postalCode: "83000" },
          { name: "ตลาดเหนือ", postalCode: "83000" },
          { name: "เกาะแก้ว", postalCode: "83000" },
          { name: "รัษฎา", postalCode: "83000" },
          { name: "วิชิต", postalCode: "83000" },
          { name: "ฉลอง", postalCode: "83130" },
          { name: "ราไวย์", postalCode: "83130" },
          { name: "กะรน", postalCode: "83100" }
        ]
      },
      {
        name: "กะทู้",
        subdistricts: [
          { name: "กะทู้", postalCode: "83120" },
          { name: "ป่าตอง", postalCode: "83150" },
          { name: "กมลา", postalCode: "83150" }
        ]
      },
      {
        name: "ถลาง",
        subdistricts: [
          { name: "เทพกระษัตรี", postalCode: "83110" },
          { name: "ศรีสุนทร", postalCode: "83110" },
          { name: "เชิงทะเล", postalCode: "83110" },
          { name: "ป่าคลอก", postalCode: "83110" },
          { name: "ไม้ขาว", postalCode: "83110" },
          { name: "สาคู", postalCode: "83110" }
        ]
      }
    ]
  },
  {
    name: "ขอนแก่น",
    districts: [
      {
        name: "เมืองขอนแก่น",
        subdistricts: [
          { name: "ในเมือง", postalCode: "40000" },
          { name: "สำราญ", postalCode: "40000" },
          { name: "โคกสี", postalCode: "40000" },
          { name: "ท่าพระ", postalCode: "40260" },
          { name: "บ้านทุ่ม", postalCode: "40000" },
          { name: "เมืองเก่า", postalCode: "40000" },
          { name: "พระลับ", postalCode: "40000" },
          { name: "สาวะถี", postalCode: "40000" },
          { name: "บ้านหว้า", postalCode: "40000" },
          { name: "บ้านค้อ", postalCode: "40000" },
          { name: "แดงใหญ่", postalCode: "40000" },
          { name: "ดอนช้าง", postalCode: "40000" },
          { name: "ดอนหัน", postalCode: "40260" },
          { name: "ศิลา", postalCode: "40000" },
          { name: "บ้านเป็ด", postalCode: "40000" },
          { name: "หนองตูม", postalCode: "40000" },
          { name: "บึงเนียม", postalCode: "40000" },
          { name: "โนนท่อน", postalCode: "40000" }
        ]
      }
    ]
  },
  {
    name: "นครราชสีมา",
    districts: [
      {
        name: "เมืองนครราชสีมา",
        subdistricts: [
          { name: "ในเมือง", postalCode: "30000" },
          { name: "โพธิ์กลาง", postalCode: "30000" },
          { name: "หนองจะบก", postalCode: "30000" },
          { name: "โคกสูง", postalCode: "30310" },
          { name: "มะเริง", postalCode: "30000" },
          { name: "หนองระเวียง", postalCode: "30000" },
          { name: "ปรุใหญ่", postalCode: "30000" },
          { name: "หมื่นไวย", postalCode: "30000" },
          { name: "พลกรัง", postalCode: "30000" },
          { name: "หนองไผ่ล้อม", postalCode: "30000" },
          { name: "สุรนารี", postalCode: "30000" },
          { name: "สีมุม", postalCode: "30000" },
          { name: "ตลาด", postalCode: "30310" },
          { name: "พุดซา", postalCode: "30000" },
          { name: "บ้านเกาะ", postalCode: "30000" },
          { name: "บ้านใหม่", postalCode: "30000" },
          { name: "จอหอ", postalCode: "30310" },
          { name: "หัวทะเล", postalCode: "30000" },
          { name: "บ้านโพธิ์", postalCode: "30310" },
          { name: "ไชยมงคล", postalCode: "30000" },
          { name: "โคกกรวด", postalCode: "30280" },
          { name: "พะเนา", postalCode: "30000" },
          { name: "หนองกระทุ่ม", postalCode: "30000" },
          { name: "หนองบัวศาลา", postalCode: "30000" },
          { name: "หลักร้อย", postalCode: "30000" }
        ]
      }
    ]
  },
  {
    name: "สงขลา",
    districts: [
      {
        name: "เมืองสงขลา",
        subdistricts: [
          { name: "บ่อยาง", postalCode: "90000" },
          { name: "เขารูปช้าง", postalCode: "90000" },
          { name: "เกาะแต้ว", postalCode: "90000" },
          { name: "พะวง", postalCode: "90100" },
          { name: "ทุ่งหวัง", postalCode: "90000" },
          { name: "เกาะยอ", postalCode: "90100" }
        ]
      },
      {
        name: "หาดใหญ่",
        subdistricts: [
          { name: "หาดใหญ่", postalCode: "90110" },
          { name: "ควนลัง", postalCode: "90110" },
          { name: "คูเต่า", postalCode: "90110" },
          { name: "คอหงส์", postalCode: "90110" },
          { name: "คลองแห", postalCode: "90110" },
          { name: "คลองอู่ตะเภา", postalCode: "90110" },
          { name: "ฉลุง", postalCode: "90110" },
          { name: "ท่าข้าม", postalCode: "90110" },
          { name: "น้ำน้อย", postalCode: "90110" },
          { name: "บ้านพรุ", postalCode: "90250" },
          { name: "พะตง", postalCode: "90230" },
          { name: "ทุ่งใหญ่", postalCode: "90110" },
          { name: "ทุ่งตำเสา", postalCode: "90110" }
        ]
      }
    ]
  }
];

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
  return subdistrict ? subdistrict.postalCode : "";
}
