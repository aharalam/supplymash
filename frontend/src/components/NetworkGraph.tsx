import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NetworkNode {
  id: string;
  label: string;
  type: 'factory' | 'farm' | 'construction' | 'restaurant' | 'retailer' | 'manufacturer' | 'other';
  position: [number, number, number];
  features: string[];
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  material: string;
  score: number;
  status: string;
}

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (node: NetworkNode) => void;
}

// ── Color palette per business type ──────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  factory:      '#f97316', // orange
  farm:         '#22c55e', // green
  construction: '#eab308', // yellow
  restaurant:   '#ec4899', // pink
  retailer:     '#3b82f6', // blue
  manufacturer: '#a855f7', // purple
  other:        '#94a3b8', // slate
};

const TYPE_ICONS: Record<string, string> = {
  factory:      '🏭',
  farm:         '🌾',
  construction: '🔧',
  restaurant:   '🍽️',
  retailer:     '🏪',
  manufacturer: '⚙️',
  other:        '🏢',
};

// ── Glow node sphere ──────────────────────────────────────────────────────────

function NodeSphere({
  node,
  isHovered,
  isConnected,
  onClick,
  onHover,
}: {
  node: NetworkNode;
  isHovered: boolean;
  isConnected: boolean;
  onClick: () => void;
  onHover: (v: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const color = TYPE_COLORS[node.type] ?? '#94a3b8';

  // Fresnel glow material via onBeforeCompile
  const glowMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: isHovered ? 1.4 : 0.6,
      metalness: 0.1,
      roughness: 0.3,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying vec3 vViewDir;
        varying vec3 vWorldNormal;
      ` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
        `,
      );
      shader.fragmentShader = `
        varying vec3 vViewDir;
        varying vec3 vWorldNormal;
      ` + shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        float fresnel = pow(1.0 - max(dot(vViewDir, vWorldNormal), 0.0), 2.5);
        gl_FragColor.rgb += fresnel * vec3(${hexToGlsl(color)}) * 1.2;
        `,
      );
    };
    return mat;
  }, [color, isHovered]);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle bob
    meshRef.current.position.y = node.position[1] + Math.sin(state.clock.elapsedTime * 0.8 + node.position[0]) * 0.08;
    // Scale pulse on hover
    const target = isHovered ? 1.25 : isConnected ? 1.1 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        material={glowMaterial}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.38, 32, 24]} />
      </mesh>

      {/* Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.52, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHovered ? 0.9 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Label — always faces camera */}
      <Billboard position={[0, 0.72, 0]}>
        <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,12,20,0.82)',
            color: '#f1f5f9',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '6px',
            border: `1px solid ${color}55`,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {TYPE_ICONS[node.type]} {node.label}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// ── Animated flow edge ────────────────────────────────────────────────────────

function FlowEdge({
  from,
  to,
  status,
  isHighlighted,
}: {
  from: [number, number, number];
  to: [number, number, number];
  status: string;
  isHighlighted: boolean;
}) {
  const particleRef = useRef<THREE.Mesh>(null!);
  const progress = useRef(Math.random()); // start at different phases

  const color = status === 'accepted' ? '#22c55e' : status === 'pending' ? '#f59e0b' : '#94a3b8';
  const opacity = isHighlighted ? 1.0 : 0.45;

  // Mid-arc control point for a curved edge
  const mid = useMemo(() => {
    const mx = (from[0] + to[0]) / 2;
    const my = (from[1] + to[1]) / 2 + 1.2;
    const mz = (from[2] + to[2]) / 2;
    return new THREE.Vector3(mx, my, mz);
  }, [from, to]);

  const curve = useMemo(
    () => new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      mid,
      new THREE.Vector3(...to),
    ),
    [from, mid, to],
  );

  const points = useMemo(() => curve.getPoints(40), [curve]);

  useFrame((_, delta) => {
    progress.current = (progress.current + delta * 0.4) % 1;
    if (particleRef.current) {
      const pt = curve.getPoint(progress.current);
      particleRef.current.position.copy(pt);
    }
  });

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={isHighlighted ? 2.5 : 1.2}
        transparent
        opacity={opacity}
        dashed={status !== 'accepted'}
        dashSize={0.15}
        gapSize={0.1}
      />
      {/* Traveling particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

// ── Helper to convert hex → GLSL vec3 ────────────────────────────────────────

function hexToGlsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}`;
}

// ── Scene contents ────────────────────────────────────────────────────────────

function Scene({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useThree(); // ensure fiber context

  const connectedToHovered = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const connected = new Set<string>();
    for (const e of edges) {
      if (e.from === hoveredId) connected.add(e.to);
      if (e.to === hoveredId) connected.add(e.from);
    }
    return connected;
  }, [hoveredId, edges]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, NetworkNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 8, 0]} intensity={12} color="#ffffff" />
      <pointLight position={[-6, 2, 4]} intensity={6} color="#6366f1" />
      <pointLight position={[6, 2, -4]} intensity={6} color="#f97316" />

      {/* Edges */}
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        const isHighlighted = !hoveredId || hoveredId === edge.from || hoveredId === edge.to;
        return (
          <FlowEdge
            key={edge.id}
            from={fromNode.position}
            to={toNode.position}
            status={edge.status}
            isHighlighted={isHighlighted}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          isHovered={hoveredId === node.id}
          isConnected={connectedToHovered.has(node.id)}
          onClick={() => onNodeClick?.(node)}
          onHover={(v) => setHoveredId(v ? node.id : null)}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={18}
        autoRotate
        autoRotateSpeed={0.4}
        maxPolarAngle={Math.PI * 0.75}
      />
    </>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      display: 'flex', flexDirection: 'column', gap: 4,
      background: 'rgba(10,12,20,0.75)', borderRadius: 10,
      padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)',
      fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
    }}>
      <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Edge Status</div>
      {[
        { color: '#22c55e', label: 'Accepted match', solid: true },
        { color: '#f59e0b', label: 'Pending match', solid: false },
      ].map(({ color, label, solid }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={28} height={8}>
            <line x1={0} y1={4} x2={28} y2={4}
              stroke={color} strokeWidth={2}
              strokeDasharray={solid ? undefined : '4 3'}
            />
          </svg>
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>{label}</span>
        </div>
      ))}
      <div style={{ color: '#475569', fontSize: 10, marginTop: 6 }}>● Drag to orbit · scroll to zoom</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function NetworkGraph({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 3, 10], fov: 50 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => {}}
      >
        <color attach="background" args={['#060a14']} />
        <fog attach="fog" args={['#060a14', 14, 30]} />
        <Scene nodes={nodes} edges={edges} onNodeClick={onNodeClick} />
      </Canvas>
      <Legend />
    </div>
  );
}
