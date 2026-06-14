import { useState } from "react";
import { useMasterStore, type MasterForm } from "../../store/master";
import { nextOverlayId, useStore } from "../../store";
import { useSettingsStore } from "../../store/settings";
import type { VehicleMaster } from "../../domain/types";
import { fmtKg } from "../../domain/jikenkyo";
import { MasterEditModal } from "../master/MasterEditModal";
import { Button } from "../common/Button";
import { Pager } from "../common/Pager";
import { IconDocs } from "../common/Icon";

const Dash = () => <span style={{ color: "var(--inkFaint)" }}>—</span>;

function downloadCsv(vehicles: VehicleMaster[]) {
  const cols = ["No", "車両番号", "車台番号", "車両コード", "社内名称", "営業所", "備考", "最大積載量(kg)", "車両総重量(kg)", "サイズ", "車格"];
  const q = (s: unknown) => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
  const body = vehicles
    .slice()
    .sort((a, b) => a.no - b.no)
    .map((v) => [v.no, v.plate, v.chassis, v.code, v.name, v.office, v.note, v.maxLoad, v.grossWeight, v.size, v.klass].map(q).join(","));
  const csv = "﻿" + cols.map(q).join(",") + "\r\n" + body.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vehicle_master.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function MasterView() {
  const vehicles = useMasterStore((s) => s.vehicles);
  const pushOverlay = useStore((s) => s.pushOverlay);
  const showToast = useStore((s) => s.showToast);
  const defaultPageSize = useSettingsStore((s) => s.live.settings.defaultPageSize);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPageSize);

  const list = vehicles.slice().sort((a, b) => b.no - a.no);
  const start = (page - 1) * perPage;
  const pageList = list.slice(start, start + perPage);

  const openEdit = (form?: MasterForm) => {
    const id = nextOverlayId();
    pushOverlay({
      id,
      title: form ? "車両情報を編集" : "新しい車両を登録",
      width: 560,
      render: (close) => <MasterEditModal initial={form} onClose={close} />,
    });
  };

  const toForm = (v: VehicleMaster): MasterForm => ({
    no: v.no, plate: v.plate, chassis: v.chassis, code: v.code, name: v.name,
    note: v.note, office: v.office, maxLoad: v.maxLoad, grossWeight: v.grossWeight, size: v.size, klass: v.klass,
  });

  const cell = (v: string) => (v ? v : <Dash />);
  const kg = (n: number | "") => (fmtKg(n) ? fmtKg(n) : <Dash />);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>マスタデータ</h1>
          <p>
            車両を登録しておくと、請求書の突合や支払申請などで選択できるようになります。車台番号を入力すると
            <b>自検協データと突合</b>し、車格・最大積載量・車両総重量・サイズを自動反映します。
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <Button
            variant="ghost"
            onClick={() => {
              downloadCsv(vehicles);
              showToast("CSVをダウンロードしました");
            }}
          >
            <IconDocs color="#0E7A4B" size={16} /> CSVダウンロード
          </Button>
          <Button variant="green" onClick={() => openEdit()}>
            新しい車両を登録
          </Button>
        </div>
      </div>

      <div className="veh-card">
        <div className="tscroll">
          <table className="vt">
            <thead>
              <tr>
                <th>No</th>
                <th>車両番号</th>
                <th>車台番号</th>
                <th>車両コード</th>
                <th>社内名称</th>
                <th>営業所</th>
                <th className="r">最大積載量</th>
                <th className="r">車両総重量</th>
                <th>サイズ</th>
                <th style={{ textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageList.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 34, color: "var(--inkSoft)" }}>
                    登録済みの車両がありません。右上から登録してください。
                  </td>
                </tr>
              ) : (
                pageList.map((v) => (
                  <tr className="vrow" key={v.no} onClick={() => openEdit(toForm(v))}>
                    <td style={{ fontFamily: "var(--mono)", color: "var(--inkSoft)" }}>{v.no}</td>
                    <td>
                      <span className="plate">{v.plate}</span>
                    </td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--inkSoft)" }}>{cell(v.chassis)}</td>
                    <td>{cell(v.code)}</td>
                    <td>{cell(v.name)}</td>
                    <td>{cell(v.office)}</td>
                    <td className="r">{kg(v.maxLoad)}</td>
                    <td className="r">{kg(v.grossWeight)}</td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 11.5, color: "var(--inkSoft)" }}>{cell(v.size)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="veh-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(toForm(v));
                        }}
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager total={list.length} page={page} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} />
      </div>
    </>
  );
}
