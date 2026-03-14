import { getTranslations } from 'next-intl/server'

export default async function AdmissionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('Admission')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
