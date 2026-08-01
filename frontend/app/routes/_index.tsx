import { images, repositories, thumbnail } from "../api";
import type { Route } from "./+types/_index";

export async function loader() {
  // サーバー側からは内部 URL（BACKEND_URL）で取得し、
  // ブラウザが参照するサムネイル URL は公開 URL（PUBLIC_BACKEND_URL）で組み立てます。
  const backend = process.env.BACKEND_URL || "http://localhost:8080";
  const publicBackend = process.env.PUBLIC_BACKEND_URL || "http://localhost:8080";

  const [imageSet, repositorySet] = await Promise.all([images(backend), repositories(backend)]);
  return { thumbs: imageSet.items, repositories: repositorySet.items, publicBackend };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { thumbs, repositories, publicBackend } = loaderData;
  return (
    <section>
      <h3 className="my-4 text-lg font-bold">画像</h3>
      <section id="thumbnails" className="grid grid-cols-5 gap-4">
        {thumbs.map((item) => (
          <div key={item.file.id} className="overflow-hidden rounded border border-gray-200 shadow-sm">
            <img
              src={thumbnail(publicBackend, item.file.id)}
              width={item.thumbnail.width}
              height={item.thumbnail.height}
              alt={item.file.name}
            />
            <div className="p-2">
              <a className="block truncate font-bold">{item.file.name}</a>
              <div className="truncate text-sm text-gray-500">
                <span>{item.file.path}</span>
              </div>
            </div>
          </div>
        ))}
      </section>
      <h3 className="my-4 text-lg font-bold">プロジェクト一覧</h3>
      <table id="projects" className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="p-2">プロジェクト名</th>
            <th className="p-2">タイトル</th>
            <th className="p-2">最後の活動</th>
          </tr>
        </thead>
        <tbody>
          {repositories.map((item) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="p-2">{item.name}</td>
              <td className="p-2">{item.title}</td>
              <td className="p-2"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ErrorBoundary() {
  return (
    <div id="error-message" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
      <p>データを読み込めませんでした。</p>
    </div>
  );
}
