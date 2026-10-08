# Copy glossary

Tone: calm, warm, concrete. Short sentences. Russian uses polite «вы» (lower-case). Uzbek uses Latin
script with proper apostrophes (oʻ, gʻ, ʼ — U+02BB and U+02BC). English is neutral.

Numbers: UZS is shown as `250 000 so'm` (uz), `250 000 сум` (ru), `250 000 UZS` (en), non-breaking
space as the thousands separator, no decimals. Phone: `+998 XX XXX XX XX`.

| Term (en)        | ru                  | uz (Latin)            | Notes                                          |
| ---------------- | ------------------- | --------------------- | ---------------------------------------------- |
| 1Heal            | 1Heal               | 1Heal                 | Brand constant, never translated               |
| subscription     | подписка            | obuna                 |                                                |
| plan             | тариф               | tarif                 | Basic / Standard / Premium stay Latin          |
| visit            | посещение           | tashrif               |                                                |
| visits left      | осталось посещений  | qolgan tashriflar     |                                                |
| venue            | заведение           | maskan                | Not «зал» — venues include spas, pools         |
| partner          | партнёр             | hamkor                |                                                |
| class            | занятие             | mashgʻulot            |                                                |
| drop-in visit    | свободное посещение | erkin tashrif         |                                                |
| booking          | бронь               | bron                  | verb: забронировать / bron qilish              |
| waitlist         | лист ожидания       | kutish roʻyxati       |                                                |
| check-in         | отметка посещения   | tashrifni tasdiqlash  | Partner UI: «Сканировать QR» / «QR skanerlash» |
| QR code          | QR-код              | QR kod                |                                                |
| no-show          | неявка              | kelmaslik             |                                                |
| freeze (noun)    | заморозка           | muzlatish             |                                                |
| auto-renew       | автопродление       | avtomatik uzaytirish  |                                                |
| cancel           | отменить            | bekor qilish          |                                                |
| favorites        | избранное           | sevimlilar            |                                                |
| review           | отзыв               | sharh                 |                                                |
| rating           | рейтинг             | reyting               |                                                |
| nearby           | рядом               | yaqin-atrofda         |                                                |
| open now         | открыто сейчас      | hozir ochiq           |                                                |
| women-only hours | женские часы        | ayollar uchun soatlar |                                                |
| sign in          | войти               | kirish                |                                                |
| code (OTP)       | код из SMS          | SMS-dagi kod          |                                                |
| continue         | продолжить          | davom etish           |                                                |
| try again        | повторить           | qayta urinish         |                                                |
| offline          | нет соединения      | internet yoʻq         |                                                |
| settings         | настройки           | sozlamalar            |                                                |
| language         | язык                | til                   |                                                |
| theme            | тема                | mavzu                 |                                                |
| support          | поддержка           | yordam                |                                                |
| delete account   | удалить аккаунт     | hisobni oʻchirish     |                                                |

Pluralisation: i18next plural keys. Russian uses `one/few/many/other`, Uzbek and English `one/other`.
Example: `visits_left: { one: "{{count}} посещение", few: "{{count}} посещения", many: "{{count}} посещений" }`.
