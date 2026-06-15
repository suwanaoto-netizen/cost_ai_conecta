import { useState } from "react";
import { VehicleMasterPanel } from "../master/VehicleMasterPanel";
import { CostCatPanel } from "../master/CostCatPanel";

type MasterTab = "vehicles" | "costCats";

export function MasterView() {
  const [tab, setTab] = useState<MasterTab>("vehicles");

  return (
    <>
      <div className="upl-tabs" style={{ marginBottom: 18 }}>
        <button className={`upl-tab ${tab === "vehicles" ? "active" : ""}`} onClick={() => setTab("vehicles")}>
          車両マスタ
        </button>
        <button className={`upl-tab ${tab === "costCats" ? "active" : ""}`} onClick={() => setTab("costCats")}>
          コスト分類
        </button>
      </div>

      {tab === "vehicles" ? <VehicleMasterPanel /> : <CostCatPanel />}
    </>
  );
}
