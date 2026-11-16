This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run both the Next.js frontend and the Socket.io WebRTC signaling server together:

```bash
npm run dev
```

* Next.js App: [http://localhost:3000](http://localhost:3000)
* WebRTC Signaling Server: [http://localhost:3001](http://localhost:3001)

### How to test Real Video Calls:
1. Open Tab 1: [http://localhost:3000/kiosk/call](http://localhost:3000/kiosk/call) (Kiosk Call Receiver)
2. Open Tab 2: [http://localhost:3000/consult/1](http://localhost:3000/consult/1) (Doctor Consultation Room)
3. In Tab 2 (Doctor), click **"कियोस्क पर कॉल करें (Start Call)"**.
4. In Tab 1 (Kiosk), the screen will ring with incoming call animation. Click **"कॉल उठाएं (Accept)"**.
5. Live peer-to-peer WebRTC video, audio, in-call chat, and real-time bandwidth telemetry will connect!

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
