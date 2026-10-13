const GATE_RE = /connexion requise|v[ée]rification impossible|acc[èe]s refus[ée]|verification impossible/i;

function isGateText(value: string): boolean {
  return GATE_RE.test(String(value || ""));
}

function hideGateNodes(): void {
  const nodes = document.querySelectorAll("body *");
  nodes.forEach((node) => {
    if (node === document.getElementById("root") || node.contains(document.getElementById("root"))) return;
    const text = String((node as HTMLElement).innerText || "");
    if (!text || text.length > 800) return;
    if (!isGateText(text)) return;
    const el = node as HTMLElement;
    el.style.setProperty("display", "none", "important");
    el.setAttribute("aria-hidden", "true");
  });
  document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";
  document.body.style.pointerEvents = "auto";
}

export function unlockPreview(): void {
  try {
    hideGateNodes();
    const observer = new MutationObserver(() => hideGateNodes());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  } catch {
    /* l'application doit rester visible même si le nettoyage échoue */
  }
}
