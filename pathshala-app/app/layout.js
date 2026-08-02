import "./globals.css";

export const metadata = {
  title: "Goal Guru — Classes 6 to 10",
  description: "Video lectures, live classes and study material for classes 6-10.",
  icons: {
    icon: [
      { url: "/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-180.png", sizes: "180x180", type: "image/png" },
    ],
    apple: "/logo-180.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
