import { telegramLinks } from '../../app/config'
import mtonga from '../../assets/lotties/mtonga.json'
import { Lottie } from '../../components/Lottie'

export function TelegramEntry() {
  return (
    <main className="telegram-entry">
      <div className="telegram-entry__content">
        <div className="telegram-entry__flag" aria-hidden="true">
          <Lottie data={mtonga} />
        </div>
        <a href={telegramLinks.miniApp}>Open the Mini-App</a>
      </div>
    </main>
  )
}
