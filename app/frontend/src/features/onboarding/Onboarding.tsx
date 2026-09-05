import { useCallback, useEffect } from 'react'
import mtonga from '../../assets/lotties/mtonga.json'
import { Lottie } from '../../components/Lottie'
import { useT } from '../../i18n/index'
import { Slide } from './Slide'

type Props = {
  onDone: () => void
}

export function Onboarding({ onDone }: Props) {
  const { t } = useT()

  const start = useCallback(() => {
    window.Telegram?.WebApp.HapticFeedback.selectionChanged()
    onDone()
  }, [onDone])

  useEffect(() => {
    window.Telegram?.WebApp?.MainButton.hide()
  }, [])

  return (
    <main className="onboarding">
      <div className="slides">
        <Slide
          hero={<Lottie data={mtonga} />}
          headline={t('onb1_title')}
          eyebrow={t('manifesto_kicker')}
          body={t('manifesto_body')}
          variant="manifesto"
        />
      </div>
      <div className="onboarding__actions">
        <button
          className="onboarding__button onboarding__button--primary"
          type="button"
          onClick={start}
        >
          {t('manifesto_cta')}
        </button>
      </div>
    </main>
  )
}
