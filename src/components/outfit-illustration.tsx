export function OutfitIllustration({ outfit }: { outfit: string }) {
  const trousers = /Sharara|Palazzo|Kurta Set/.test(outfit);
  const separate = /Lehenga|Skirt|Half-Saree/.test(outfit);
  const short = /Frock/.test(outfit);
  return <svg viewBox="0 0 100 120" className="h-28 w-24 text-primary" fill="none" aria-hidden="true">
    <path d="M40 13 Q50 21 60 13 L70 20 79 43 69 47 64 31 61 51 39 51 36 31 31 47 21 43 30 20Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.3" />
    <path d="M42 14 Q50 30 58 14 M39 45H61" stroke="currentColor" strokeWidth="1.3" />
    {trousers ? <><path d="M38 54H62L76 108H54L50 67 46 108H24Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.3" />{outfit.includes("Kurta") && <path d="M39 45H61L68 79H32Z" fill="var(--secondary)" stroke="currentColor" />}</> : <path d={`M39 ${separate ? 56 : 51}H61L${short ? 76 : 85} ${short ? 91 : 108}Q50 ${short ? 99 : 116} ${short ? 24 : 15} ${short ? 91 : 108}Z`} fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.3" />}
    <path d={trousers ? "M34 101H46 M54 101H68" : `M${short ? 27 : 19} ${short ? 86 : 102}Q50 ${short ? 92 : 110} ${short ? 73 : 81} ${short ? 86 : 102}`} stroke="currentColor" strokeWidth="2" />
    {!trousers && <path d="M43 60 35 98 M50 60V104 M57 60 65 98" stroke="currentColor" strokeOpacity=".35" />}
    {outfit === "Half-Saree" && <path d="M35 23 66 63 72 95" stroke="currentColor" strokeWidth="5" strokeOpacity=".35" />}
    <path d="M46 35h8M50 31v8" stroke="currentColor" strokeOpacity=".45" />
  </svg>;
}