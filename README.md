# fish-catcher

A minimal full-stack starter built with Next.js, TypeScript, and Prisma.

## Included

- Next.js 16 with the App Router
- TypeScript and the default Next.js ESLint setup
- Prisma 7 initialized for MySQL with a ready-to-use auth schema
- A mobile-first welcome page and home page with real auth entry flows

## Start

```bash
npm install
cp .env.example .env
npm run dev
```

Then open `http://localhost:3000`.

## Database configuration

This project is now prepared to use a dedicated MySQL database called `fish`.

Recommended split:

- `prisma/schema.prisma`: chooses the database type (`mysql`)
- `prisma.config.ts`: tells Prisma CLI to read `DATABASE_URL`
- `.env`: stores the real connection details for local or server use
- `src/lib/prisma.ts`: creates the single Prisma client used by app code

Create the database on your MySQL server first:

```sql
CREATE DATABASE fish CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you want a dedicated account for this project, use something like:

```sql
CREATE USER 'fish_user'@'%' IDENTIFIED BY 'replace-with-password';
GRANT ALL PRIVILEGES ON fish.* TO 'fish_user'@'%';
FLUSH PRIVILEGES;
```

## Auth configuration

This project now includes a working H5-first auth skeleton:

- Guest login works immediately
- Phone verification login works with a real API flow
- Google OAuth and WeChat OAuth are wired as provider-ready flows
- First sign-in automatically creates the account when no identity exists

Configure the following in `.env`:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SESSION_DAYS="30"
PHONE_CODE_TTL_MINUTES="5"
```

### Phone verification

Development default:

```bash
SMS_PROVIDER="mock"
```

This will generate the verification code and return it to the frontend for local testing.

If you want to connect a real SMS provider without changing app code, switch to webhook mode:

```bash
SMS_PROVIDER="webhook"
SMS_WEBHOOK_URL="https://your-service.example.com/send-sms"
SMS_WEBHOOK_TOKEN="optional-secret"
SMS_SIGN_NAME="your-sign"
SMS_TEMPLATE_CODE="your-template"
```

Your webhook will receive `phone`, `code`, `scene`, `signName`, and `templateCode`.

### Google login

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

Google callback path is:

```text
/api/auth/google/callback
```

### WeChat H5 login

```bash
WECHAT_APP_ID=""
WECHAT_APP_SECRET=""
WECHAT_OAUTH_SCOPE="snsapi_userinfo"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

WeChat callback path is:

```text
/api/auth/wechat/callback
```

For WeChat, this is the place where you will later fill your official account `AppID` and `AppSecret`.

## Prisma

Prisma is already wired into the project with a first business schema for users, auth identities, sessions, and phone verification codes.

1. Extend `prisma/schema.prisma` with your domain models.
2. Run `npm run prisma:generate`.
3. Run `npm run prisma:migrate:dev`.

Useful commands:

```bash
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:studio
```

## Suggested places to extend

- `src/app`: pages, layouts, and route handlers
- `prisma/schema.prisma`: database models
- `src/lib/prisma.ts`: shared Prisma client
- `src/lib/auth.ts`: auth, session, and provider helpers
- `src/lib/auth-config.ts`: auth-related environment variable contract
- `src/app/page.tsx`: current welcome screen
