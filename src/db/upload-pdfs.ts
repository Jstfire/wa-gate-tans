import { db } from './index'
import { content_files_wagate } from './schema/messages'
import { getGoogleDriveClient } from '../lib/google-drive'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PDF_SOURCE_DIR = '/mnt/c/laragon/www/bot-wa-pst/src/data/pdf'
const GOOGLE_DRIVE_FOLDER_ID = '1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D'

const PDF_FILES = [
  {
    filename: 'Kabupaten Buton Selatan Dalam Angka 2025.pdf',
    name: 'Kabupaten Buton Selatan Dalam Angka 2025',
    category: 'publikasi_dda',
  },
  {
    filename: 'Kecamatan Batauga Dalam Angka 2025.pdf',
    name: 'Kecamatan Batauga Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Batu Atas Dalam Angka 2025.pdf',
    name: 'Kecamatan Batu Atas Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Kadatua Dalam Angka 2025.pdf',
    name: 'Kecamatan Kadatua Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Lapandewa Dalam Angka 2025.pdf',
    name: 'Kecamatan Lapandewa Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Sampolawa Dalam Angka 2025.pdf',
    name: 'Kecamatan Sampolawa Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Siompu Barat Dalam Angka 2025.pdf',
    name: 'Kecamatan Siompu Barat Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
  {
    filename: 'Kecamatan Siompu Dalam Angka 2025.pdf',
    name: 'Kecamatan Siompu Dalam Angka 2025',
    category: 'publikasi_kcda',
  },
]

async function uploadPDFs(): Promise<void> {
  console.log('📤 Starting PDF upload to Google Drive...')
  
  // Initialize Google Drive client
  const driveClient = getGoogleDriveClient()
  
  let successCount = 0
  let failCount = 0
  
  for (const pdfInfo of PDF_FILES) {
    try {
      const filePath = join(PDF_SOURCE_DIR, pdfInfo.filename)
      
      console.log(`\n📄 Processing: ${pdfInfo.filename}`)
      
      // Read file
      const fileBuffer = readFileSync(filePath)
      const fileStats = statSync(filePath)
      
      console.log(`  Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`)
      
      // Upload to Google Drive
      console.log('  ⬆️  Uploading to Google Drive...')
      const uploadResult = await driveClient.uploadFile(
        pdfInfo.filename,
        'application/pdf',
        fileBuffer
      )
      
      console.log(`  ✅ Uploaded - Drive ID: ${uploadResult.id}`)
      
      // Save metadata to database
      await db.insert(content_files_wagate).values({
        name: pdfInfo.name,
        originalFilename: pdfInfo.filename,
        mimeType: 'application/pdf',
        fileSize: fileStats.size,
        googleDriveId: uploadResult.id,
        googleDriveUrl: uploadResult.url,
        category: pdfInfo.category,
      })
      
      console.log('  💾 Metadata saved to database')
      successCount++
      
    } catch (error) {
      console.error(`  ❌ Failed to process ${pdfInfo.filename}:`, error)
      failCount++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`✅ Successfully uploaded: ${successCount}/${PDF_FILES.length}`)
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}/${PDF_FILES.length}`)
  }
  console.log('='.repeat(50))
}

async function main(): Promise<void> {
  try {
    await uploadPDFs()
    console.log('\n✅ PDF upload completed!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error during PDF upload:', error)
    process.exit(1)
  }
}

main()
