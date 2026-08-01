import "./globals.css";

export const metadata = {
  title: "Goal Guru — Classes 6 to 10",
  description: "Video lectures, live classes and study material for classes 6-10.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
