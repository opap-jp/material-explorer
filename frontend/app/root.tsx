import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <title>素材管理システム（仮） - OPAP-JP</title>
        <Meta />
        <Links />
      </head>
      <body>
        <nav className="fixed inset-x-0 top-0 z-10 bg-gray-900 text-white">
          <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
            <a href="/" className="font-bold">
              Material Explorer
            </a>
            <a href="#" className="text-gray-300 hover:text-white">
              すべての素材
            </a>
            <div className="ml-auto">
              <input
                type="text"
                placeholder="検索"
                className="rounded bg-gray-800 px-3 py-1 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 pt-20 pb-8">{children}</main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
