export interface ChatbotRuleData {
  trigger: string
  parentTrigger: string | null
  responseType: 'text' | 'location' | 'pdf' | 'link' | 'admin'
  responseContent: string
  responseMetadata: {
    pdf_id?: string
    location_coords?: { lat: number; lng: number }
    link_url?: string
  }
  order: number
}

export const chatbotRules: ChatbotRuleData[] = [
  // Main menu trigger
  {
    trigger: 'menu',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'MAIN_MENU',
    responseMetadata: {},
    order: 0,
  },
  
  // Main Menu Option 1: Location & Schedule (direct response)
  {
    trigger: '1',
    parentTrigger: null,
    responseType: 'location',
    responseContent: 'Kantor Badan Pusat Statistik Kab. Buton Selatan',
    responseMetadata: {
      location_coords: { lat: -5.608591411817911, lng: 122.60022162024016 },
    },
    order: 1,
  },
  
  // Main Menu Option 2: Perpustakaan (submenu)
  {
    trigger: '2',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'SUB_MENU_PERPUSTAKAAN',
    responseMetadata: {},
    order: 2,
  },
  
  // Main Menu Option 3: Rekomendasi Statistik (submenu)
  {
    trigger: '3',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'SUB_MENU_REKOMENDASI',
    responseMetadata: {},
    order: 3,
  },
  
  // Main Menu Option 4: Konsultasi Statistik (submenu)
  {
    trigger: '4',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'SUB_MENU_KONSULTASI',
    responseMetadata: {},
    order: 4,
  },
  
  // Main Menu Option 5: Statistik Umum (direct response)
  {
    trigger: '5',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'STATISTIK_UMUM',
    responseMetadata: {},
    order: 5,
  },
  
  // Main Menu Option 6: Publikasi DDA (direct PDF)
  {
    trigger: '6',
    parentTrigger: null,
    responseType: 'pdf',
    responseContent: 'Kabupaten Buton Selatan Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'busel_dda_2025',
    },
    order: 6,
  },
  
  // Main Menu Option 7: Publikasi KCDA (submenu)
  {
    trigger: '7',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'SUB_MENU_PUBLIKASI_KCDA',
    responseMetadata: {},
    order: 7,
  },
  
  // Main Menu Option 8: Chat Admin
  {
    trigger: '8',
    parentTrigger: null,
    responseType: 'admin',
    responseContent: 'ADMIN_JAM',
    responseMetadata: {},
    order: 8,
  },
  
  // Perpustakaan Submenu - Option 1: PST Online
  {
    trigger: '1',
    parentTrigger: '2',
    responseType: 'link',
    responseContent: '*📚 Kunjungi PST Online:*',
    responseMetadata: {
      link_url: 'https://perpustakaan.bps.go.id/opac/',
    },
    order: 21,
  },
  
  // Perpustakaan Submenu - Option 2: Lokasi & Jadwal
  {
    trigger: '2',
    parentTrigger: '2',
    responseType: 'location',
    responseContent: 'Kantor Badan Pusat Statistik Kab. Buton Selatan',
    responseMetadata: {
      location_coords: { lat: -5.608591411817911, lng: 122.60022162024016 },
    },
    order: 22,
  },
  
  // Rekomendasi Statistik Submenu - Option 1: Web Romantik
  {
    trigger: '1',
    parentTrigger: '3',
    responseType: 'link',
    responseContent: '*🔗 Akses Romantik:*',
    responseMetadata: {
      link_url: 'https://romantik.web.bps.go.id/',
    },
    order: 31,
  },
  
  // Rekomendasi Statistik Submenu - Option 2: Chat Admin
  {
    trigger: '2',
    parentTrigger: '3',
    responseType: 'admin',
    responseContent: 'ADMIN_JAM',
    responseMetadata: {},
    order: 32,
  },
  
  // Konsultasi Statistik Submenu - Option 1: Chat Admin
  {
    trigger: '1',
    parentTrigger: '4',
    responseType: 'admin',
    responseContent: 'ADMIN_JAM',
    responseMetadata: {},
    order: 41,
  },
  
  // Konsultasi Statistik Submenu - Option 2: Kunjungan Offline
  {
    trigger: '2',
    parentTrigger: '4',
    responseType: 'location',
    responseContent: 'Kantor Badan Pusat Statistik Kab. Buton Selatan',
    responseMetadata: {
      location_coords: { lat: -5.608591411817911, lng: 122.60022162024016 },
    },
    order: 42,
  },
  
  // Publikasi KCDA Submenu - Kecamatan options
  {
    trigger: '1',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Batu Atas Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'batu_atas_2025',
    },
    order: 71,
  },
  {
    trigger: '2',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Lapandewa Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'lapandewa_2025',
    },
    order: 72,
  },
  {
    trigger: '3',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Sampolawa Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'sampolawa_2025',
    },
    order: 73,
  },
  {
    trigger: '4',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Batauga Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'batauga_2025',
    },
    order: 74,
  },
  {
    trigger: '5',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Siompu Barat Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'siompu_barat_2025',
    },
    order: 75,
  },
  {
    trigger: '6',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Siompu Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'siompu_2025',
    },
    order: 76,
  },
  {
    trigger: '7',
    parentTrigger: '7',
    responseType: 'pdf',
    responseContent: 'Kecamatan Kadatua Dalam Angka 2025',
    responseMetadata: {
      pdf_id: 'kadatua_2025',
    },
    order: 77,
  },
  
  // Back to main menu (99)
  {
    trigger: '99',
    parentTrigger: null,
    responseType: 'text',
    responseContent: 'MAIN_MENU',
    responseMetadata: {},
    order: 99,
  },
]
