const GATE_RE = /connexion requise|v[ée]rification impossible|acc[èe]s refus[ée]|verification impossible/i;

function isGateText(value: string): boolean {
  return GATE_RE.test(String(value || ""));
}

function hideGateNodes(): void {
  const root = document.getElementById("root");
  const nodes = document.querySelectorAll("body *");
  nodes.forEach((node) => {
    if (!node || node === root || (root && node.contains(root))) return;
    const el = node as HTMLElement;
    const text = String(el.innerText || "");
    if (!text || text.length > 800 || !isGateText(text)) return;
    el.style.setProperty("display", "none", "important");
    el.setAttribute("aria-hidden", "true");
  });
  document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";
  document.body.style.pointerEvents = "auto";
  if (root) root.style.pointerEvents = "auto";
}

export function unlockPreview(): void {
  try {
    hideGateNodes();
    const observer = new MutationObserver(() => hideGateNodes());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);
  } catch {
    /* l'application reste visible même si le nettoyage échoue */
  }
}
