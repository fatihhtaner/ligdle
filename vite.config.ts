import { readFileSync } from "node:fs";
import { relative, dirname } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { ARTICLES } from "./src/content/articles";
import { render } from "./src/content/render";

/** Oyun dışındaki statik sayfalar: [adres, başlık]. Alt menü ve site haritası bu listeden kurulur. */
const PAGES: [string, string][] = [
  ["rehber", "Rehber"],
  ["arsiv", "Arşiv"],
  ["hakkinda", "Hakkında"],
  ["gizlilik", "Gizlilik"],
  ["kosullar", "Kullanım koşulları"],
  ["iletisim", "İletişim"],
];

/** Derlenen bütün sayfalar: oyun, alt menüdeki sayfalar ve rehber yazıları. */
const ALL = ["", ...PAGES.map(([path]) => `${path}/`), ...ARTICLES.map(([slug]) => `rehber/${slug}/`)];

/**
 * Statik sayfalardaki <!--site-header--> ve <!--site-footer--> yerlerine ortak üst ve alt kısmı koyar,
 * her sayfaya AdSense doğrulama etiketi ekler, <!--render:…--> yerlerine veriden üretilen tabloları koyar (src/content/render.ts), derlemede sitemap.xml, ads.txt ve robots.txt üretir. Bağlantılar göreli: site alt klasörde de çalışır.
 */
function site(siteUrl: string, adsense: string): Plugin {
  const page = (name: string) => readFileSync(new URL(`./src/site/${name}.html`, import.meta.url), "utf8");
  return {
    name: "ligdle-site",
    transformIndexHtml(html, ctx) {
      const depth = relative(dirname(ctx.filename), new URL(".", import.meta.url).pathname) || ".";
      const root = depth === "." ? "./" : `${depth}/`;
      const links = PAGES.map(([path, title]) => `<a href="${root}${path}/">${title}</a>`).join("");
      return render(html, root)
        .replace("</head>", `<meta name="google-adsense-account" content="${adsense}">\n</head>`)
        .replace("<!--site-header-->", page("header").replaceAll("{root}", root))
        .replace("<!--site-footer-->", page("footer").replaceAll("{root}", root).replace("{links}", links));
    },
    generateBundle() {
      this.emitFile({
        type: "asset", fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
          ALL.map(u => `  <url><loc>${siteUrl}${u}</loc></url>`).join("\n")}\n</urlset>\n`,
      });
      // Reklam satabilecek tek yetkili hesap: AdSense bunu görmezse "ads.txt eksik" uyarısı verir
      this.emitFile({ type: "asset", fileName: "ads.txt", source: `google.com, ${adsense.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n` });
    },
  };
}

// base "./": the build works from any sub-path (GitHub Pages /ligdle/) or straight from disk.
export default defineConfig(({ mode }) => {
  // Sitenin kalıcı adresi .env dosyasında; alan adı alınınca yalnızca orası değişir.
  const env = loadEnv(mode, process.cwd());
  return {
    base: "./",
    plugins: [react(), site(env.VITE_SITE_URL, env.VITE_ADSENSE_CLIENT)],
    build: {
      rollupOptions: {
        input: Object.fromEntries(ALL.map(u => [u.slice(0, -1).replaceAll("/", "-") || "main", `${u}index.html`])),
      },
    },
  };
});
