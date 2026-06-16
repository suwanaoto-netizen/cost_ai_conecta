/**
 * docs/PRD-print.html を配布用 PDF（docs/AI_Fleet_Pilot_PRD.pdf）へ変換する。
 *
 * 前提: ヘッドレス Chromium（@sparticuz/chromium + puppeteer-core）。
 *   cd app && npm install -D @sparticuz/chromium puppeteer-core
 * 実行（node_modules 解決のため app/ を cwd にする）:
 *   cd app && node ../docs/html-to-pdf.cjs
 */
const path = require("path");
const { pathToFileURL } = require("url");
// 依存（@sparticuz/chromium, puppeteer-core）は app/node_modules から解決する（cwd 非依存）。
const appReq = (m) => require(require.resolve(m, { paths: [path.resolve(__dirname, "../app/node_modules")] }));
const chromium = (() => { const c = appReq("@sparticuz/chromium"); return c.default || c; })();
const puppeteer = appReq("puppeteer-core");

const HTML = path.resolve(__dirname, "PRD-print.html");
const PDF = path.resolve(__dirname, "AI_Fleet_Pilot_PRD.pdf");

(async () => {
  const exe = await chromium.executablePath();
  const b = await puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: exe, headless: "shell" });
  const p = await b.newPage();
  await p.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle0", timeout: 60000 });
  await p.emulateMediaType("print");
  await p.pdf({ path: PDF, format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
  await b.close();
  console.log("PDF →", PDF, (require("fs").statSync(PDF).size / 1048576).toFixed(2), "MB");
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
