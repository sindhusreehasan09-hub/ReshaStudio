import { backOpening, NECKLINE_PATHS, previewColour, sleeveLength, type BlouseDraft } from "@/lib/blouse-preview";

export function BlouseSketch({ draft, back = false, thumbnail = false }: { draft: BlouseDraft; back?: boolean; thumbnail?: boolean }) {
  const length = sleeveLength(draft.sleeve);
  const puff = /puff|bubble|bishop|lantern/.test(draft.sleeve ?? "");
  const flare = /bell|flare|ruffle|flutter|feather/.test(draft.sleeve ?? "");
  const opening = backOpening(draft.backDesign, draft.backDepth);
  const dori = back && (draft.backDori && draft.backDori !== "none" || /dori|bow/.test(draft.backDesign ?? ""));
  const sheer = back && /sheer/.test(draft.backDesign ?? "");
  const decorated = draft.blouseEmbellishment && draft.blouseEmbellishment !== "plain";
  return <svg viewBox="0 0 200 170" role={thumbnail ? undefined : "img"} aria-hidden={thumbnail || undefined} aria-label={thumbnail ? undefined : `${back ? "Back" : "Front"} blouse sketch`} className="size-full! text-primary" fill="none">
    <g fill={previewColour(draft.blouseColour, draft.blouseColourCustom)} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      {length > 0 && <>
        <path d={`M65 35 L45 42 ${puff ? "Q13 47 29" : "L25"} ${48 + length} L${flare ? 10 : 33} ${53 + length} L${flare ? 43 : 51} ${53 + length} L65 65Z`} />
        <path d={`M135 35 L155 42 ${puff ? "Q187 47 171" : "L175"} ${48 + length} L${flare ? 190 : 167} ${53 + length} L${flare ? 157 : 149} ${53 + length} L135 65Z`} />
      </>}
      <path d="M65 35 H135 L145 52 L133 83 L132 137 Q100 149 68 137 L67 83 L55 52Z" />
    </g>
    {back ? <>
      {opening && <path d={opening} fill={sheer ? "var(--muted)" : "var(--background)"} fillOpacity={sheer ? ".6" : "1"} stroke="currentColor" strokeWidth="1.8" />}
      {sheer && <path d="M80 48 L120 98 M120 48 L80 98 M90 45 L125 80 M110 45 L75 80" stroke="currentColor" strokeOpacity=".35" />}
      {dori && <g stroke="currentColor" strokeWidth="1.8"><path d="M73 58 Q100 63 127 58 M100 61 L91 96 M100 61 L109 96" />{["double", "criss-cross", "multiple"].includes(draft.backDori ?? "") && <path d="M75 72 L124 90 M125 72 L76 90" />}{draft.backTassels && draft.backTassels !== "none" && <path d="M91 96 L85 110 H97Z M109 96 L103 110 H115Z" fill="var(--gold)" />}</g>}
      {/button|hook|closed/.test(draft.backDesign ?? "") && <g stroke="currentColor"><path d="M100 43 V132" />{[60, 77, 94, 111].map(y => <circle key={y} cx="104" cy={y} r="2" />)}</g>}
    </> : <path d={NECKLINE_PATHS[draft.neckline]} fill="var(--background)" stroke="currentColor" strokeWidth="2" />}
    <path d="M69 129 Q100 139 131 129 M78 94 L83 127 M122 94 L117 127" stroke="currentColor" strokeOpacity=".45" />
    {decorated && <g stroke="var(--gold)" strokeWidth="1.8">{[78, 100, 122].map(x => <g key={x}><path d={`M${x - 4} 116 H${x + 4} M${x} 112 V120`} /><circle cx={x} cy="116" r="3" /></g>)}</g>}
    {draft.blouseFabric === "brocade" && <path d="M80 105 L100 88 L120 105 M80 126 L100 109 L120 126" stroke="currentColor" strokeOpacity=".4" />}
  </svg>;
}