import { waClientManager } from './wa-client'
import { startBlastEngine } from './blast-engine'
import { processChatbotMessage } from './chatbot-engine'

// Wire chatbot processor into WA client (avoids circular import at module load time)
waClientManager.setChatbotProcessor(processChatbotMessage)

export { waClientManager } from './wa-client'
export { blastEngine, startBlastEngine } from './blast-engine'
export { processChatbotMessage } from './chatbot-engine'

/**
 * Initialize all services:
 * - Starts the WhatsApp client (connects / restores session)
 * - Starts the blast engine polling loop
 */
export async function initializeServices(): Promise<void> {
  console.log('[Services] Initializing WA client...')
  await waClientManager.initialize()

  console.log('[Services] Starting blast engine...')
  startBlastEngine()

  console.log('[Services] All services initialized')
}
