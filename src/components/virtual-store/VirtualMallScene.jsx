import {
  BILLING_COUNTER,
  EXIT_GATE_ZONE,
  FLASH_SALE_ZONE,
  SECTION_ZONES,
  VIEWPORT,
  getDisplayMeta,
  polygonFromRect,
  projectIsometric,
  unprojectIsometric
} from "./virtualMallConfig.js";

const FloorGrid = () => {
  const tiles = [];

  for (let x = 0; x < 18; x += 1) {
    for (let y = 0; y < 14; y += 1) {
      const top = projectIsometric({ x, y });
      const right = projectIsometric({ x: x + 1, y });
      const bottom = projectIsometric({ x: x + 1, y: y + 1 });
      const left = projectIsometric({ x, y: y + 1 });

      tiles.push(
        <polygon
          key={`${x}-${y}`}
          points={`${top.left},${top.top} ${right.left},${right.top} ${bottom.left},${bottom.top} ${left.left},${left.top}`}
          className="virtual-mall-tile"
        />
      );
    }
  }

  return <>{tiles}</>;
};

const SectionLabel = ({ zone }) => {
  const position = projectIsometric({
    x: zone.x + zone.w / 2,
    y: zone.y + zone.h + 0.3,
    z: 2
  });

  return (
    <div
      className="virtual-mall-section-label"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        color: zone.color
      }}
    >
      {zone.label}
    </div>
  );
};

const ProductDisplay = ({ display, isNearby, isSelected, onSelect }) => {
  const meta = getDisplayMeta(display);
  const position = projectIsometric({ x: display.x, y: display.y, z: display.height });
  const width = display.type === "fashion" ? 102 : 138;
  const height = display.type === "fashion" ? 166 : 152;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(display);
      }}
      className={`virtual-mall-display virtual-mall-display--${display.type} ${
        isNearby ? "is-nearby" : ""
      } ${isSelected ? "is-selected" : ""}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${width}px`,
        height: `${height}px`,
        "--display-glow": display.glow,
        zIndex: Math.round((display.x + display.y) * 100) + 80
      }}
    >
      <span className="virtual-mall-display__shadow" />
      <span className="virtual-mall-display__pedestal" />
      <span className="virtual-mall-display__plinth" />
      <span className="virtual-mall-display__card">
        {meta.product?.image ? (
          <img src={meta.product.image} alt={meta.title} className="virtual-mall-display__image" />
        ) : (
          <span className="virtual-mall-display__placeholder">{display.type === "fashion" ? "FW" : "TX"}</span>
        )}
      </span>
      <span className="virtual-mall-display__title">{meta.title}</span>
      <span className="virtual-mall-display__price">
        {meta.price ? `Rs. ${meta.price}` : display.type === "fashion" ? "Curated Drop" : "Interactive Tech"}
      </span>
      {isNearby ? <span className="virtual-mall-display__badge">Inspect</span> : null}
    </button>
  );
};

const BillingCounter = () => {
  const base = projectIsometric({ x: BILLING_COUNTER.x, y: BILLING_COUNTER.y, z: 76 });
  const sign = projectIsometric({ x: BILLING_COUNTER.x - 0.15, y: BILLING_COUNTER.y + 0.55, z: 162 });

  return (
    <>
      <div
        className="virtual-mall-counter"
        style={{
          left: `${base.left}px`,
          top: `${base.top}px`,
          zIndex: Math.round((BILLING_COUNTER.x + BILLING_COUNTER.y) * 100) + 120
        }}
      >
        <span className="virtual-mall-counter__deck" />
        <span className="virtual-mall-counter__front" />
      </div>
      <div
        className="virtual-mall-counter-sign"
        style={{
          left: `${sign.left}px`,
          top: `${sign.top}px`,
          zIndex: Math.round((BILLING_COUNTER.x + BILLING_COUNTER.y) * 100) + 125
        }}
      >
        <span className="virtual-mall-counter-sign__title">Billing Counter</span>
        <span className="virtual-mall-counter-sign__logo">Razorpay</span>
        <span className="virtual-mall-counter-sign__logo is-alt">Paytm</span>
      </div>
    </>
  );
};

const ExitPortal = () => {
  const portal = projectIsometric({ x: EXIT_GATE_ZONE.x + 0.95, y: EXIT_GATE_ZONE.y + 1.2, z: 138 });

  return (
    <div
      className="virtual-mall-portal"
      style={{
        left: `${portal.left}px`,
        top: `${portal.top}px`,
        zIndex: 1040
      }}
    >
      <span className="virtual-mall-portal__frame" />
      <span className="virtual-mall-portal__field" />
      <span className="virtual-mall-portal__caption">Exit Portal</span>
    </div>
  );
};

const PlayerAvatar = ({ player }) => {
  const position = projectIsometric({ x: player.x, y: player.y, z: 56 });

  return (
    <div
      className="virtual-mall-player"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        zIndex: Math.round((player.x + player.y) * 100) + 400
      }}
    >
      <span className="virtual-mall-player__shadow" />
      <span className="virtual-mall-player__body" />
      <span className="virtual-mall-player__head" />
      <span className="virtual-mall-player__core" />
    </div>
  );
};

const FlashSaleRing = () => {
  const center = projectIsometric({ x: FLASH_SALE_ZONE.x, y: FLASH_SALE_ZONE.y, z: 8 });

  return (
    <div
      className="virtual-mall-flash-sale"
      style={{
        left: `${center.left}px`,
        top: `${center.top}px`,
        zIndex: 880
      }}
    >
      <span className="virtual-mall-flash-sale__ring" />
      <span className="virtual-mall-flash-sale__core" />
      <span className="virtual-mall-flash-sale__text">FLASH SALE</span>
      <span className="virtual-mall-flash-sale__subtext">limited-time drop</span>
    </div>
  );
};

const AisleAccent = ({ x1, y1, x2, y2, color }) => {
  const start = projectIsometric({ x: x1, y: y1 });
  const end = projectIsometric({ x: x2, y: y2 });

  return (
    <line
      x1={start.left}
      y1={start.top}
      x2={end.left}
      y2={end.top}
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      className="virtual-mall-aisle-line"
    />
  );
};

const VirtualMallScene = ({
  player,
  displays,
  selectedDisplayId,
  nearbyDisplayId,
  onSceneClick,
  onDisplaySelect
}) => {
  const handleSceneClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const left = ((event.clientX - rect.left) / rect.width) * VIEWPORT.width;
    const top = ((event.clientY - rect.top) / rect.height) * VIEWPORT.height;
    onSceneClick(unprojectIsometric({ left, top }));
  };

  return (
    <div className="virtual-mall-stage" onClick={handleSceneClick}>
      <svg
        className="virtual-mall-grid"
        viewBox={`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <filter id="tileGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#5ac8fa" floodOpacity="0.16" />
          </filter>
        </defs>
        <FloorGrid />
        {Object.values(SECTION_ZONES).map((zone) => (
          <polygon
            key={zone.id}
            points={polygonFromRect(zone)}
            stroke={zone.color}
            strokeWidth="5"
            fill="none"
            className="virtual-mall-zone-outline"
          />
        ))}
        <polygon
          points={polygonFromRect(EXIT_GATE_ZONE)}
          stroke="#a855f7"
          strokeWidth="4"
          fill="none"
          className="virtual-mall-zone-outline is-portal"
        />
        <AisleAccent x1={2.1} y1={6.9} x2={15.8} y2={6.9} color="#a78bfa" />
        <AisleAccent x1={9.15} y1={1.25} x2={9.15} y2={12.8} color="#7dd3fc" />
      </svg>

      {Object.values(SECTION_ZONES).map((zone) => (
        <SectionLabel key={zone.id} zone={zone} />
      ))}

      <FlashSaleRing />
      <BillingCounter />
      <ExitPortal />

      {displays.map((display) => (
        <ProductDisplay
          key={display.id}
          display={display}
          isNearby={nearbyDisplayId === display.id}
          isSelected={selectedDisplayId === display.id}
          onSelect={onDisplaySelect}
        />
      ))}

      <PlayerAvatar player={player} />
    </div>
  );
};

export default VirtualMallScene;
