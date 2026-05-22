import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth'
import templates from './routes/templates'
import chatbot from './routes/chatbot'
import officers from './routes/officers'
import messages from './routes/messages'
import blast from './routes/blast'
import content from './routes/content'
import apiKeys from './routes/api-keys'
import waAccounts from './routes/wa-accounts'
import users from './routes/users'

const api = new Hono().basePath('/api')

api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

api.route('/auth', auth)
api.route('/templates', templates)
api.route('/chatbot', chatbot)
api.route('/officers', officers)
api.route('/messages', messages)
api.route('/blast', blast)
api.route('/content', content)
api.route('/api-keys', apiKeys)
api.route('/wa-accounts', waAccounts)
api.route('/users', users)
api.route('/roles', users)

api.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

export default api
