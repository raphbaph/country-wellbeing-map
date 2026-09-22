import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import { NEUTRAL, NO_DATA, scoreColor } from "../color";
import type { WorldCollection } from "../types";

interface View {
  x: number;
  y: number;
  k: number;
}

interface WorldMapProps {
  world: WorldCollection;
  scores: Map<string, number>;
  anyEnabled: boolean;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function WorldMap({ world, scores, anyEnabled, activeId, onHover, onSelect }: WorldMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{
    id: string | null;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.max(320, entry.contentRect.width);
      const height = Math.max(280, entry.contentRect.height);
      setSize({ width, height });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    viewRef.current = { x: 0, y: 0, k: 1 };
    setView({ x: 0, y: 0, k: 1 });
  }, [size.width, size.height]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const current = viewRef.current;
      const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
      const nextK = Math.min(16, Math.max(1, current.k * factor));
      const ratio = nextK / current.k;
      const next =
        nextK === 1
          ? { x: 0, y: 0, k: 1 }
          : {
              k: nextK,
              x: mx - ratio * (mx - current.x),
              y: my - ratio * (my - current.y),
            };
      viewRef.current = next;
      setView(next);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const paths = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [16, 16],
        [size.width - 16, size.height - 16],
      ],
      world as unknown as GeoPermissibleObjects,
    );
    const path = geoPath(projection);
    return world.features.map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      d: path(feature as unknown as GeoPermissibleObjects) ?? "",
    }));
  }, [world, size.width, size.height]);

  function zoomBy(factor: number) {
    const current = viewRef.current;
    const nextK = factor === 0 ? 1 : Math.min(16, Math.max(1, current.k * factor));
    const cx = size.width / 2;
    const cy = size.height / 2;
    const ratio = nextK / current.k;
    const next =
      nextK === 1
        ? { x: 0, y: 0, k: 1 }
        : {
            k: nextK,
            x: cx - ratio * (cx - current.x),
            y: cy - ratio * (cy - current.y),
          };
    viewRef.current = next;
    setView(next);
  }

  return (
    <div className="map-host" ref={hostRef}>
      <svg
        ref={svgRef}
        className="map"
        width={size.width}
        height={size.height}
        role="img"
        aria-label="World map colored by the composite of enabled indicators"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const target = event.target;
          const countryId =
            target instanceof SVGPathElement ? target.getAttribute("data-id") : null;
          svgRef.current?.setPointerCapture(event.pointerId);
          dragRef.current = {
            id: countryId,
            x: event.clientX,
            y: event.clientY,
            ox: viewRef.current.x,
            oy: viewRef.current.y,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) > 4) drag.moved = true;
          if (!drag.moved) return;
          const next = { ...viewRef.current, x: drag.ox + dx, y: drag.oy + dy };
          viewRef.current = next;
          setView(next);
        }}
        onPointerUp={() => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (drag && !drag.moved && drag.id) onSelect(drag.id);
        }}
        onPointerLeave={() => {
          if (!dragRef.current) onHover(null);
        }}
      >
        <rect width={size.width} height={size.height} className="ocean" />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {paths.map((shape) => {
            const score = scores.get(shape.id);
            const fill = !anyEnabled ? NEUTRAL : score === undefined ? NO_DATA : scoreColor(score);
            const active = shape.id === activeId;
            return (
              <path
                key={shape.id}
                data-id={shape.id}
                d={shape.d}
                fill={fill}
                vectorEffect="non-scaling-stroke"
                className={active ? "country active" : "country"}
                onMouseEnter={() => onHover(shape.id)}
                onMouseLeave={() => onHover(null)}
              >
                <title>{shape.name}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <div className="map-tools">
        <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => zoomBy(0)} aria-label="Reset map view">
          Reset
        </button>
      </div>
      <p className="map-hint">Scroll to zoom, drag to pan. Hover or click a country.</p>
    </div>
  );
}
