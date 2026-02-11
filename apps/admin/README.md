This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## 後端同步

角色列表與詳情由 **Backend API** 拉取（Supabase 資料），不再僅用 mock / localStorage。

1. 複製 `.env.local.example` 為 `.env.local`
2. 設定 `NEXT_PUBLIC_API_BASE=http://localhost:8000`（或你的後端位址）
3. 設定 `ADMIN_USER` / `ADMIN_PASSWORD` 與後端 `.env` 一致（用於 `/admin/roles` Basic 認證）
4. 先啟動後端（`services/backend` 下 `docker compose up -d`），再啟動 admin

若後端不可用，角色頁會顯示錯誤提示並 fallback 至本地快取或 mock 資料。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
