import { Code, Copy, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { getBaseUrl, trpc } from '@/utils/trpc'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'
import { ESupportedSnippetLanguage } from '@/types/snippet'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './ui/dialog'
import useDarkMode from '@/hooks/useDarkmode'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Link } from '@/i18n/routing'
import { RouteConf } from '@/constants/route'
import { useWorkflowStore } from '@/states/workflow'
import useCopyAction from '@/hooks/useCopyAction'

export const WorkflowApiSnippet = () => {
  const isDark = useDarkMode()
  const [open, setOpen] = useState(false)
  const [tabIndx, setTabIndx] = useState<number>(0)
  const { copyToClipboard } = useCopyAction()
  const [token, setToken] = useState('')
  const [language, setLanguage] = useState<ESupportedSnippetLanguage>(ESupportedSnippetLanguage.JAVASCRIPT_FETCH)
  const { slug } = useCurrentRoute()
  const { currentInput } = useWorkflowStore()

  const { data: info } = trpc.workflow.get.useQuery(slug!, {
    enabled: !!slug && open
  })
  const workflowSnippets = trpc.snippet.workflow.useQuery(
    { id: slug!, input: currentInput, host: getBaseUrl() },
    {
      enabled: !!slug && open
    }
  )
  const tokenData = trpc.token.listByWorkflow.useQuery(
    { workflowId: slug! },
    {
      enabled: !!slug && open
    }
  )

  const tabs = workflowSnippets.data?.map((snip) => snip.name) ?? []

  const handlePressCopyButton = () => {
    const snippet = workflowSnippets.data?.[tabIndx]
    if (!snippet) return null
    const snippetContent = snippet.snippets.find((snip) => snip.id === language)
    if (!snippetContent) return null
    const content = token ? snippetContent.content.replace('REPLACE_API_TOKEN', token) : snippetContent.content
    copyToClipboard(content, 'Copied to clipboard')
  }

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setToken('')
          setTabIndx(0)
        }
        setOpen(open)
      }}
    >
      <DialogTrigger asChild>
        <Button size='icon' variant='secondary' className='rounded-full'>
          <Code size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className='w-[1024px] max-w-none gap-2'>
        <DialogTitle>
          <div className='w-full'>
            <h1>Example API Snippet</h1>
            <p className='text-xs font-normal pt-1'>
              For <strong>{info?.name}</strong> workflow
            </p>
          </div>
        </DialogTitle>
        <div className='relative w-full h-[480px]'>
          <Tabs
            value={tabs[tabIndx]}
            onValueChange={(val) => setTabIndx(tabs.indexOf(val))}
            className='absolute h-full w-full flex flex-col overflow-hidden'
          >
            <TabsList className='w-min'>
              {tabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => {
              const snippet = workflowSnippets.data?.find((snip) => snip.name === tab)
              if (!snippet) return null
              const snippetContent = snippet.snippets.find((snip) => snip.id === language)
              if (!snippetContent) return null

              const content = token
                ? snippetContent.content.replace('REPLACE_API_TOKEN', token.slice(-8) + '...')
                : snippetContent.content

              return (
                <TabsContent key={tab} value={tab} className='flex-1 relative'>
                  <code className='text-xs'>{snippet.description}</code>
                  <SyntaxHighlighter
                    language={language.split('_')[0]}
                    style={isDark ? oneDark : oneLight}
                    wrapLines
                    wrapLongLines
                    customStyle={{
                      width: '100%',
                      height: '100%',
                      paddingBottom: 64,
                      position: 'absolute',
                      overflow: 'auto'
                    }}
                  >
                    {content}
                  </SyntaxHighlighter>
                </TabsContent>
              )
            })}
          </Tabs>
          <div className='absolute bottom-5 right-5 flex gap-2'>
            <Select value={token} onValueChange={(value) => setToken(value)}>
              <SelectTrigger className='w-[180px] capitalize bg-background'>
                <SelectValue placeholder='Select token' className='p-0 items-start' />
              </SelectTrigger>
              <SelectContent>
                {tokenData.data?.tokens.map((token) => {
                  const tokenPiece = token.id.slice(-8)
                  return (
                    <SelectItem key={token.id} value={token.id} className='flex w-full flex-col items-start'>
                      <p className='text-left'>#{tokenPiece}...</p>
                      <span>{token.description}</span>
                    </SelectItem>
                  )
                })}
                {
                  <Link
                    href={RouteConf.settingTokens.path}
                    className='flex gap-2 items-center p-2 text-foreground/50 hover:text-foreground transition-all'
                  >
                    <span className='text-sm'>Add new token</span>
                    <Plus size={12} />
                  </Link>
                }
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={(value) => setLanguage(value as ESupportedSnippetLanguage)}>
              <SelectTrigger className='w-[180px] capitalize bg-background'>
                <SelectValue placeholder='Select language' className='capitalize' />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ESupportedSnippetLanguage).map((lang) => {
                  const [target, method] = lang.split('_')
                  return (
                    <SelectItem key={lang} value={lang} className='flex w-full capitalize'>
                      {target} {!!method && <strong className='text-xs ml-auto uppercase'>{method}</strong>}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button onClick={handlePressCopyButton} size='icon' variant='outline' className='bg-background'>
              <Copy size={16} />
            </Button>
          </div>
        </div>
        <div className='mx-auto'>
          <p className='text-sm text-muted-foreground'>
            For more detailed, please visit{' '}
            <a
              href={`${getBaseUrl()}/swagger#tag/workflow/POST/api/ext/workflow/{id}/execute`}
              className='underline hover:text-primary'
              target='_blank'
              rel='noopener noreferrer'
            >
              API Documentation
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
