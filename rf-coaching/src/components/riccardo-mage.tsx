/**
 * Mago in pixel-art mostrato accanto al saluto della Dashboard.
 *
 * WebP animato trasparente a 12 fotogrammi: levitazione e fiamme viola le fa il
 * browser da solo, senza JavaScript. Lo stile sta in .riccardo-mage (globals.css);
 * per cambiare dimensione si agisce lì, oppure con una classe passata da fuori.
 *
 * Puramente decorativo: nascosto agli screen reader, non intercetta mai il puntatore.
 */
export function RiccardoMage({ className = "" }: { className?: string }) {
  return (
    <div className={`riccardo-mage ${className}`} aria-hidden="true">
      <img src="/assets/riccardo-mage-animated.webp" alt="" draggable={false} />
    </div>
  );
}
