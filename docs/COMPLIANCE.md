# Compliance and legal flags (Uzbekistan)

Everything in this file must be verified by a local lawyer before launch. Items are design
constraints the codebase already honours plus open questions.

## 1. Personal data localization

Flag: Uzbekistan's personal data law (ЗРУ-547 with 2021 amendments) requires personal data of
citizens to be processed and stored on servers physically located in Uzbekistan, with the database
registered in the State Register.

Design response: all data access is behind `src/services/*` interfaces and plain SQL migrations;
the backend can be deployed as self-hosted Supabase or vanilla Postgres inside Uzbekistan. Storage
(avatars, exports) goes through a `StorageProvider` interface. Analytics is consent-gated and
anonymised. Open question: hosting provider inside UZ and the register filing — lawyer + ops.

## 2. Payments and fiscal receipts

Flag: payments through Payme, Click and Uzum require merchant contracts and provider certification;
online sales must issue fiscal receipts through an OFD/fiscal module, and subscriptions must be
shown with a clear price, period and cancellation terms.

Design response: provider adapters are sandbox-first; `payments.fiscal_receipt` stores the fiscal
data returned by the provider/OFD integration; state machine + ledger support refunds and disputes.
The app never handles card data (provider-hosted flows). Open question: which OFD integration the
chosen providers supply and whether 1Heal or the venue is the fiscal seller.

## 3. SMS

Flag: SMS sender names must be registered with Eskiz and operators; OTP templates may need
pre-approval. Design response: `SmsProvider` interface; templates in one place; rate limits.

## 4. App store policies

- Subscription terms, price, renewal and cancellation are shown before purchase.
- In-app account deletion with data export (Apple and Google both require it).
- Third-party payment providers for physical services are allowed on both stores (service is
  consumed outside the app); keep that framing in the store listing.

## 5. Health-adjacent data

Visit history by category can reveal health information. Treated as sensitive: not shared with
analytics, not exported to third parties, deleted with the account, minimised in logs.

## 6. Consents

Separate, versioned consents for terms, privacy and marketing in `consents`. Location only
when-in-use; camera only in partner mode; notifications after explicit priming.

## 7. Session tokens on the device

Flag: with the Supabase auth provider, supabase-js persists the access and refresh tokens in
AsyncStorage (plain storage: app-private files on Android, the app sandbox on iOS) rather than in
the OS keychain/keystore. The refresh token is long-lived, so a rooted device or a backup extraction
could reuse it.

Design response (M1): the app-level device id and the QR token window already go through
expo-secure-store; the mock provider stores its session there too. Open item (M2): evaluate an
encrypted storage adapter for supabase-js (AES key held in SecureStore, ciphertext in AsyncStorage),
server-side refresh-token rotation and reuse detection (Supabase default), and a device list with
remote revocation (`devices.revoked_at`). Biometric lock (`profiles.biometric_lock`) is a later
milestone.
