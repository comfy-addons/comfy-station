import React, { useRef, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { Button } from './ui/button'
import { trpc } from '@/utils/trpc'
import { Square, X } from 'lucide-react'
import 'winbox/dist/css/winbox.min.css' // required
import WinBox from 'react-winbox'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import useDarkMode from '@/hooks/useDarkmode'

interface IClientTerminalWindowsState {
  openedIds: string[]
  open: (id: string) => void
  close: (id: string) => void
  closeAll: () => void
}

interface IServerLog {
  m: string
  t: string
}

export const useClientTerminalWindows = create<IClientTerminalWindowsState>((set) => ({
  openedIds: [],
  open: (id) => {
    set((state) => {
      if (!state.openedIds.includes(id)) {
        return { openedIds: [...state.openedIds, id] }
      }
      return state
    })
  },
  close: (id) => set((state) => ({ openedIds: state.openedIds.filter((i) => i !== id) })),
  closeAll: () => set({ openedIds: [] })
}))

const ClientTerminal: IComponent<{
  id: string
}> = ({ id }) => {
  const isDark = useDarkMode()
  const terminalRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const terminal = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon>(new FitAddon())
  const buffer = useRef<IServerLog[]>([])
  const MAX_LINES = 10000 // Adjust based on your needs

  const { data: logs } = trpc.client.getTerminalLogs.useQuery(id)

  const handleNewLogs = useCallback((logs: IServerLog[]) => {
    if (!terminal.current) return

    // Batch updates
    const formatted = logs.map(formatLog).join('\r\n') + '\r\n'

    // Check current line count
    const currentLineCount = terminal.current.buffer.active.length

    // Write new logs
    terminal.current.write(formatted)
  }, [])

  trpc.client.watchTerminalLogs.useSubscription(id, {
    onData: (data) => {
      if (!terminal.current) {
        buffer.current.push(data)
      } else {
        handleNewLogs([data])
      }
    }
  })

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize terminal
    terminal.current = new Terminal({
      scrollback: MAX_LINES,
      disableStdin: true,
      cursorBlink: false,
      allowProposedApi: true,
      fontSize: 14,
      theme: {
        background: '#00000000',
        foreground: '#d4d4d4'
      }
    })

    terminal.current.loadAddon(fitAddon.current)
    terminal.current.open(terminalRef.current)
    fitAddon.current.fit()

    return () => {
      terminal.current?.dispose()
      terminal.current = null
    }
  }, [])

  useEffect(() => {
    if (!terminal.current) return
    if (isDark) {
      terminal.current.options.theme = {
        background: '#00000000',
        foreground: '#d4d4d4'
      }
    } else {
      terminal.current.options.theme = {
        background: '#ffffff00',
        foreground: '#000000'
      }
    }
  }, [isDark])

  useEffect(() => {
    const resizeListener = () => fitAddon.current.fit()
    // Handle resize event of winbox
    window.addEventListener(`${id}-resize`, resizeListener)
    return () => {
      window.removeEventListener(`${id}-resize`, resizeListener)
    }
  }, [id])

  useEffect(() => {
    if (!logs) return
    if (terminal.current) {
      const formatted = logs.entries.map(formatLog)
      terminal.current.write(formatted.join('\r\n') + '\r\n')
    }

    // Process buffered logs
    if (buffer.current.length > 0) {
      handleNewLogs(buffer.current)
      buffer.current = []
    }
  }, [handleNewLogs, logs])

  const formatLog = (log: IServerLog) => {
    const timestamp = `\x1b[38;5;75m[${new Date(log.t).toLocaleString()}]\x1b[0m`
    return `${timestamp} ${log.m}`
  }

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
}

export const TerminalWinbox: IComponent<{
  id: string
  onClose: (id: string) => void
}> = ({ id, onClose }) => {
  const { data } = trpc.client.get.useQuery(id, {
    refetchOnWindowFocus: false
  })
  const isMaximized = useRef(false)
  const winboxRef = useRef<WinBox | null>(null)

  const triggerResize = () => {
    setTimeout(() => {
      window?.dispatchEvent(new Event(`${id}-resize`))
    }, 500)
  }

  const clientName =
    data?.name || (data?.host ? new URL(data.host).hostname.split('.')[0] : `Client #${id.slice(0, 8)}`)

  return (
    <WinBox
      key={id}
      id={id}
      ref={winboxRef}
      onClose={() => onClose(id)}
      noMin
      noFull
      onResize={triggerResize}
      noMax
      noClose
      noShadow
      x={window.innerWidth / 2 - 300}
      y={window.innerHeight / 2 - 128}
      width={600}
      height={256}
      minWidth={600}
      minHeight={256}
      className='rounded-xl !overflow-hidden !bg-background/90 backdrop-blur !border !shadow relative'
    >
      <div className='absolute top-2 right-2 z-10 flex gap-1 bg-secondary/50 backdrop-blur rounded-xl p-1 items-center'>
        <div className='flex flex-col px-2'>
          <code className='text-[10px] font-bold uppercase'>Terminal logs</code>
          <code className='uppercase -mt-1'>{clientName}</code>
        </div>
        <Button
          size='icon'
          variant='secondary'
          onClick={() => {
            if (isMaximized.current) {
              isMaximized.current = false
              winboxRef.current?.restore()
            } else {
              isMaximized.current = true
              winboxRef.current?.maximize()
            }
            triggerResize()
          }}
        >
          <Square className='w-4 h-4' />
        </Button>
        <Button size='icon' variant='secondary' onClick={() => onClose(id)}>
          <X className='w-4 h-4' />
        </Button>
      </div>
      <div className='absolute w-full h-full overflow-hidden px-1'>
        <ClientTerminal id={id} />
      </div>
    </WinBox>
  )
}

export const ClientTerminalWindows = () => {
  const { openedIds, close } = useClientTerminalWindows()

  return (
    <>
      {openedIds.map((info) => (
        <TerminalWinbox key={info} id={info} onClose={close} />
      ))}
    </>
  )
}
