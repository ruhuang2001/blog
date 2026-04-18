import { publicConfig } from '@/lib/server/config'

export default function handler (req, res) {
  if (req.method === 'GET') {
    res.status(200).json(publicConfig)
  } else {
    res.status(204).end()
  }
}
