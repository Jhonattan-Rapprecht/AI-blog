import { useEffect, useState } from 'react'
import { api, socket } from '@/api/client'

export function useAIStatus() {
  const [status, setStatus] = useState({ label: 'Checking...', ok: false })

  useEffect(() => {
    const load = () =>
      api
        .status()
        .then((s) => setStatus({ label: `${s.provider} (${s.model})`, ok: s.status === 'connected' || s.status === 'ok' || !!s.status }))
        .catch(() => setStatus({ label: 'Disconnected', ok: false }))
    load()
    socket.on('connect', load)
    socket.on('connect_error', () => setStatus({ label: 'Disconnected', ok: false }))
    return () => {
      socket.off('connect', load)
      socket.off('connect_error')
    }
  }, [])

  return status
}
