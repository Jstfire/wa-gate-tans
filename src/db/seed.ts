import { db } from './index'
import {
  wa_templates_wagate,
  chatbot_rules_wagate,
  officer_numbers_wagate,
} from './schema/wa'
import { roles_wagate } from './schema/auth'
import { chatbotRules } from './data/chatbot-rules'

// WA Templates data from old repo
const templates = [
  {
    name: 'MAIN_MENU',
    content: `🎉 Selamat datang di *Pelayanan Statistik Terpadu (PST) Badan Pusat Statistik Kabupaten Buton Selatan* 🎉

Silakan pilih layanan yang Anda butuhkan dengan mengetik angka sesuai pilihan berikut:

1. 📍 Lokasi & Jadwal PST – Temukan kami offline
2. 📚 Perpustakaan – Akses buku & referensi statistik
3. 📄 Rekomendasi Statistik – Ajukan surat rekomendasi survei
4. 🧑‍🏫 Konsultasi Statistik – Tanya data, metode, atau analisis
5. 📈 Statistik Umum – Info terkini Buton Selatan
6. 📘 Publikasi DDA – Data lengkap tingkat kabupaten
7. 📗 Publikasi KCDA – Data per kecamatan
8. 💬 Chat Admin – Hubungi petugas langsung

📌 Cukup ketik angka layanan (contoh: 3) untuk mulai.

Kunjungi buselkab.bps.go.id untuk data dan publikasi lainnya.

> _Pesan ini dikirim otomatis oleh Bot PST BPS Kabupaten Buton Selatan._ `,
    category: 'menu',
    variables: [],
  },
  {
    name: 'MAIN_MENU_NEXT',
    content: `Silakan pilih layanan yang Anda butuhkan dengan mengetik angka sesuai pilihan berikut:

1. 📍 Lokasi & Jadwal PST – Temukan kami offline
2. 📚 Perpustakaan – Akses buku & referensi statistik
3. 📄 Rekomendasi Statistik – Ajukan surat rekomendasi survei
4. 🧑‍🏫 Konsultasi Statistik – Tanya data, metode, atau analisis
5. 📈 Statistik Umum – Info terkini Buton Selatan
6. 📘 Publikasi DDA – Data lengkap tingkat kabupaten
7. 📗 Publikasi KCDA – Data per kecamatan
8. 💬 Chat Admin – Hubungi petugas langsung

📌 Cukup ketik angka layanan (contoh: 3) untuk mulai.

Kunjungi buselkab.bps.go.id untuk data dan publikasi lainnya.

> _Pesan ini dikirim otomatis oleh Bot PST BPS Kabupaten Buton Selatan._ `,
    category: 'menu',
    variables: [],
  },
  {
    name: 'WELCOME_MESSAGE',
    content: `🎉 *Selamat datang di WhatsApp PST BPS Kabupaten Buton Selatan* 🎉

Ketik *menu* untuk melihat pilihan layanan yang tersedia.

> _Pesan ini dikirim otomatis oleh Bot PST BPS Kabupaten Buton Selatan._`,
    category: 'system',
    variables: [],
  },
  {
    name: 'MENU_EXPIRED',
    content: `⌛ *Sesi menu Anda telah berakhir karena tidak ada aktivitas selama 3 jam.*

Ketik *menu* jika Anda ingin melihat pilihan layanan kembali.

Jika Anda memerlukan bantuan langsung, silakan tuliskan pesan dan admin kami akan segera membantu Anda.`,
    category: 'system',
    variables: [],
  },
  {
    name: 'SUB_MENU_PERPUSTAKAAN',
    content: `*📚 Menu Perpustakaan*

1. *PST Online* 🌐 – Akses koleksi buku dan publikasi BPS secara online
2. *Lokasi & Jadwal* 📍🕒 – Informasi lokasi dan jam buka perpustakaan

99. *Kembali ke menu utama* 🔄

> Ketik angka pilihan Anda`,
    category: 'submenu',
    variables: [],
  },
  {
    name: 'SUB_MENU_REKOMENDASI',
    content: `*📄 Rekomendasi Statistik*

1. *Web Romantik* 🌐 – Ajukan rekomendasi statistik online
2. *Chat Admin* 💬 – Konsultasi dengan petugas kami

99. *Kembali ke menu utama* 🔄

> Ketik angka pilihan Anda`,
    category: 'submenu',
    variables: [],
  },
  {
    name: 'SUB_MENU_KONSULTASI',
    content: `*🧑‍🏫 Konsultasi Statistik*

1. *Chat Admin* 💬 – Konsultasi via WhatsApp
2. *Kunjungan Offline* 📍 – Informasi kunjungan ke kantor

99. *Kembali ke menu utama* 🔄

> Ketik angka pilihan Anda`,
    category: 'submenu',
    variables: [],
  },
  {
    name: 'SUB_MENU_PUBLIKASI_KCDA',
    content: `*📗 Menu Publikasi KCDA*

Silakan pilih kecamatan:

1. *Kecamatan Batu Atas* 📊
2. *Kecamatan Lapandewa* 📊
3. *Kecamatan Sampolawa* 📊
4. *Kecamatan Batauga* 📊
5. *Kecamatan Siompu Barat* 📊
6. *Kecamatan Siompu* 📊
7. *Kecamatan Kadatua* 📊

99. *Kembali ke menu utama* 🔄

> Ketik angka kecamatan yang ingin Anda akses`,
    category: 'submenu',
    variables: [],
  },
  {
    name: 'SUB_MENU_LOKASI_JADWAL',
    content: `*📍 Lokasi & Jadwal Layanan*

1. *Lokasi Kantor* 📍 – Lihat lokasi BPS Buton Selatan di peta
2. *Jadwal Layanan* 🕒 – Informasi jam operasional PST

99. *Kembali ke menu utama* 🔄

> Ketik angka pilihan Anda`,
    category: 'submenu',
    variables: [],
  },
  {
    name: 'STATISTIK_UMUM',
    content: `*📊 Statistik Umum Kabupaten Buton Selatan*

📘 Berdasarkan Publikasi Kabupaten Buton Selatan Dalam Angka 2025:
- *👥 Jumlah Penduduk:* 102.881 jiwa
- *📈 Indeks Pembangunan Manusia (IPM):* 68,04
- *💸 Persentase Penduduk Miskin:* 14,28%

📗 Berdasarkan Publikasi PDRB Menurut Lapangan Usaha 2020–2024:
- *💰 PDRB ADHB:* Rp3.826,60 miliar
- *💵 PDRB ADHK:* Rp2.320,67 miliar
- *🌾 PDRB ADHB Kategori Pertanian, Kehutanan, dan Perikanan:* Rp1.289,97 miliar
- *🌱 PDRB ADHK Kategori Pertanian, Kehutanan, dan Perikanan:* Rp750,42 miliar

📋 Berdasarkan Survei Angkatan Kerja Nasional (SAKERNAS) 2024:
- 🧑‍💼 Tingkat Pengangguran Terbuka (TPT): 3,48%

📝 *Catatan:*
* *_PDRB ADHB:* Produk Domestik Regional Bruto Atas Dasar Harga Berlaku_
* *_PDRB ADHK:* Produk Domestik Regional Bruto Atas Dasar Harga Konstan (tahun dasar 2010)_`,
    category: 'content',
    variables: [],
  },
  {
    name: 'LOKASI',
    content: `*📍 Lokasi Pelayanan Statistik Terpadu (PST) BPS Kabupaten Buton Selatan*

🗺️ Google Maps: `,
    category: 'content',
    variables: [],
  },
  {
    name: 'JADWAL_BUKA',
    content: `*🕒 Jadwal Pelayanan PST:*

* 📅 *Senin – Kamis:* 07.30 – 16.00 WITA
* 📅 *Jumat:* 07.30 – 16.30 WITA
* ❌ *Sabtu & Minggu:* Libur

💡 Silakan kunjungi kami sesuai jam layanan untuk mendapatkan pelayanan data dan konsultasi statistik secara langsung.`,
    category: 'content',
    variables: [],
  },
  {
    name: 'ADMIN_JAM',
    content: `⏰ *Jam Operasional Admin:* 08.00 – 20.00 WITA
💬 Anda bisa berkonsultasi langsung dengan admin selama jam operasional.`,
    category: 'admin',
    variables: [],
  },
  {
    name: 'ADMIN_END',
    content: `Jika Anda sudah selesai berkonsultasi, *silakan ketik "00" untuk mengakhiri chat dan kembali ke menu utama.* 🔁
🙏 Terima kasih telah menggunakan layanan kami!`,
    category: 'admin',
    variables: [],
  },
  {
    name: 'THANKS',
    content: `*🙏 Terima kasih telah menggunakan layanan kami!*`,
    category: 'system',
    variables: [],
  },
  {
    name: 'PUBLIKASI',
    content: `*📘 Berikut merupakan _file_ publikasi yang ingin Anda akses.*`,
    category: 'system',
    variables: [],
  },
  {
    name: 'WEB_BUSEL',
    content: `*🌐 Kunjungi buselkab.bps.go.id untuk data dan publikasi lainnya.*`,
    category: 'system',
    variables: [],
  },
  {
    name: 'WAITING',
    content: `*⏳ Mohon ditunggu sebentar...*`,
    category: 'system',
    variables: [],
  },
  {
    name: 'INVALID',
    content: `*❗Pilihan tidak valid.*`,
    category: 'system',
    variables: [],
  },
]

async function seedTemplates(): Promise<void> {
  console.log('🌱 Seeding WA templates...')
  
  for (const template of templates) {
    await db.insert(wa_templates_wagate).values({
      name: template.name,
      content: template.content,
      category: template.category,
      variables: template.variables,
      isActive: true,
    })
  }
  
  console.log(`✅ Seeded ${templates.length} templates`)
}

async function seedChatbotRules(): Promise<void> {
  console.log('🌱 Seeding chatbot rules...')
  
  for (const rule of chatbotRules) {
    await db.insert(chatbot_rules_wagate).values({
      trigger: rule.trigger,
      parentTrigger: rule.parentTrigger,
      responseType: rule.responseType,
      responseContent: rule.responseContent,
      responseMetadata: rule.responseMetadata,
      order: rule.order,
      isActive: true,
    })
  }
  
  console.log(`✅ Seeded ${chatbotRules.length} chatbot rules`)
}

async function seedOfficerNumbers(): Promise<void> {
  console.log('🌱 Seeding officer numbers...')
  
  const officers = [
    {
      name: 'Admin 1',
      phoneNumber: '6289616370100',
      position: 'Admin PST',
      isActive: true,
    },
    {
      name: 'Admin 2',
      phoneNumber: '6283856685530',
      position: 'Admin PST',
      isActive: true,
    },
  ]
  
  for (const officer of officers) {
    await db.insert(officer_numbers_wagate).values(officer)
  }
  
  console.log(`✅ Seeded ${officers.length} officer numbers`)
}

async function seedRoles(): Promise<void> {
  console.log('🌱 Seeding roles...')
  
  const roles = [
    {
      name: 'admin',
      permissions: {
        wa_connect: true,
        wa_send: true,
        wa_blast: true,
        templates: true,
        chatbot: true,
        content: true,
        api_keys: true,
        users: true,
      },
    },
    {
      name: 'operator',
      permissions: {
        wa_connect: true,
        wa_send: true,
        wa_blast: true,
        templates: true,
        chatbot: false,
        content: true,
        api_keys: false,
        users: false,
      },
    },
    {
      name: 'viewer',
      permissions: {
        wa_connect: false,
        wa_send: false,
        wa_blast: false,
        templates: false,
        chatbot: false,
        content: false,
        api_keys: false,
        users: false,
      },
    },
  ]
  
  for (const role of roles) {
    await db.insert(roles_wagate).values(role)
  }
  
  console.log(`✅ Seeded ${roles.length} roles`)
}

// Main seed function
async function seed(): Promise<void> {
  try {
    console.log('🚀 Starting database seeding...')
    
    await seedTemplates()
    await seedOfficerNumbers()
    await seedRoles()
    await seedChatbotRules()
    
    console.log('✅ Database seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seed()
