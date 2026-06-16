/**
 * PRD 用の画面キャプチャを撮影する（実アプリのスクリーンショット）。
 *
 * 前提:
 *   1) アプリをビルドして配信しておく（既定 URL: http://127.0.0.1:4173/）
 *        cd app && npm install && npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
 *   2) ヘッドレス Chromium を用意（このリポジトリの egress では cdn.playwright.dev が
 *      ブロックされるため、npm 配布の @sparticuz/chromium を使う）:
 *        cd app && npm install -D @sparticuz/chromium puppeteer-core
 *
 * 実行:
 *   cd app && BASE_URL=http://127.0.0.1:4173/ node ../docs/capture-screens.cjs
 *   （node_modules 解決のため app/ を cwd にして実行する）
 *
 * 出力: docs/img/*.png
 */
const path = require("path");
const fs = require("fs");
// 依存（@sparticuz/chromium, puppeteer-core）は app/node_modules から解決する（cwd 非依存）。
const appReq = (m) => require(require.resolve(m, { paths: [path.resolve(__dirname, "../app/node_modules")] }));
const chromium = (() => { const c = appReq("@sparticuz/chromium"); return c.default || c; })();
const puppeteer = appReq("puppeteer-core");

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173/";
const OUT = path.resolve(__dirname, "img"); // docs/img
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 連携アラートは初期状態が空のため、図版用に代表的なアラートを localStorage に投入する。
const SAMPLE_ALERTS = {
  alerts: [
    { id: "inc_mom|veh1|燃料費|2026-06", kind: "inc_mom", title: "燃料費が前月比 +32%",
      detail: "車番 名古屋100あ1234・2026-06　¥472,100（前月 ¥357,600）", vehTarget: "名古屋100あ1234", ym: "2026-06",
      createdAt: "2026-06-16 09:12:03", target: { type: "veh_karte", vehKey: "veh1" } },
    { id: "inc_avg3|veh2|修繕・維持費|2026-06", kind: "inc_avg3", title: "修繕・維持費が前3ヶ月平均比 +58%",
      detail: "車番 豊橋800せ4455・2026-06　¥210,000（前3ヶ月平均 ¥133,000）", vehTarget: "豊橋800せ4455", ym: "2026-06",
      createdAt: "2026-06-16 09:12:03", target: { type: "veh_karte", vehKey: "veh2" } },
    { id: "pickup_change|increase|enter|veh3", kind: "pickup_change", title: "岐阜100か7890 が「コスト増加車両」に入りました",
      detail: "コストモニターで確認できます", vehTarget: "岐阜100か7890",
      createdAt: "2026-06-16 09:12:03", target: { type: "pickup", listId: "increase", vehKey: "veh3" } },
  ],
  seenAlertIds: {}, prevCostMap: {}, prevPickup: { attention: [], topcost: [], increase: [] },
};

(async () => {
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--force-color-profile=srgb"],
    executablePath: exe, headless: "shell",
    defaultViewport: { width: 1340, height: 1000, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();

  async function fresh(h = 1000) {
    await page.setViewport({ width: 1340, height: h, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.waitForSelector(".side", { timeout: 15000 });
    await page.evaluate(() => { const t = document.querySelector(".side.collapsed .side-toggle"); if (t) t.click(); });
    await sleep(350);
  }
  async function nav(label) {
    await page.evaluate((l) => {
      const b = [...document.querySelectorAll(".navbtn")].find((x) => x.getAttribute("data-label") === l);
      if (b) b.click();
    }, label);
    await sleep(450);
  }
  async function clickText(sel, text) {
    return page.evaluate((s, t) => {
      const el = [...document.querySelectorAll(s)].find((x) => (x.textContent || "").includes(t));
      if (el) { el.click(); return true; } return false;
    }, sel, text);
  }
  async function shot(name) { await sleep(250); await page.screenshot({ path: path.join(OUT, name) }); console.log("✓", name); }

  // 1. 書類一覧
  await fresh(1000); await shot("01-documents.png");

  // 2. 書類詳細パネル
  await fresh(1040);
  await page.evaluate(() => { const r = document.querySelector("table tbody tr"); if (r) r.click(); });
  await sleep(500); await shot("02-doc-panel.png");

  // 3. アップロードモーダル
  await fresh(1000); await clickText(".pagehead button", "新規アップロード"); await sleep(500); await shot("03-upload.png");

  // 4. コストモニター（モニタータブ）
  await fresh(1580); await nav("コストモニター"); await sleep(600); await shot("04-monitor.png");

  // 5. 個別モニタータブ
  await fresh(1180); await nav("コストモニター"); await clickText(".upl-tab", "個別モニター"); await sleep(500); await shot("05-monitor-individual.png");

  // 6. 車両カルテ（ピックアップから）
  await fresh(1240); await nav("コストモニター"); await sleep(500);
  await page.evaluate(() => { const i = document.querySelector(".pk-item"); if (i) i.click(); });
  await sleep(500); await shot("06-vehicle-karte.png");

  // 7. マスタデータ
  await fresh(1040); await nav("マスタデータ"); await sleep(500); await shot("07-master.png");

  // 8. 設定
  await fresh(1520); await nav("設定"); await sleep(500); await shot("08-settings.png");

  // 9. 連携アラート（サンプル投入 → ベルを開く）
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => localStorage.setItem("alerts.v1", JSON.stringify(s)), SAMPLE_ALERTS);
  await fresh(1000);
  await page.evaluate(() => { const b = document.querySelector(".bell"); if (b) b.click(); });
  await sleep(400); await shot("09-alerts.png");

  await browser.close();
  console.log("done →", OUT);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
