import 'prismjs/themes/prism.css'
import 'react-notion-x/src/styles.css'
import 'katex/dist/katex.min.css'
import '@waline/client/style'
import '@/styles/globals.css'
import '@/styles/notion.css'
import dynamic from 'next/dynamic'
import loadLocale from '@/assets/i18n'
import { ConfigProvider } from '@/lib/config'
import { LocaleProvider } from '@/lib/locale'
import { prepareDayjs } from '@/lib/dayjs'
import { ThemeProvider } from '@/lib/theme'
import Scripts from '@/components/Scripts'
import { publicConfig } from '@/lib/server/config'

const Ackee = dynamic(() => import('@/components/Ackee'), { ssr: false })
const Gtag = dynamic(() => import('@/components/Gtag'), { ssr: false })

prepareDayjs(publicConfig.timezone)

const locale = loadLocale('basic', publicConfig.lang)

export default function MyApp ({ Component, pageProps }) {
  return (
    <ConfigProvider value={publicConfig}>
      <Scripts />
      <LocaleProvider value={locale}>
        <ThemeProvider>
          <>
            {process.env.VERCEL_ENV === 'production' && publicConfig?.analytics?.provider === 'ackee' && (
              <Ackee
                ackeeServerUrl={publicConfig.analytics.ackeeConfig.dataAckeeServer}
                ackeeDomainId={publicConfig.analytics.ackeeConfig.domainId}
              />
            )}
            {process.env.VERCEL_ENV === 'production' && publicConfig?.analytics?.provider === 'ga' && <Gtag />}
            <Component {...pageProps} />
          </>
        </ThemeProvider>
      </LocaleProvider>
    </ConfigProvider>
  )
}
