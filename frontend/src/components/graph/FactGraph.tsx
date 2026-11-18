import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Relation, RelationFactSummary } from '../../api/types';
import * as labels from '../../lib/labels';
import { truncate } from '../../lib/format';

type GraphNode = {
  id: string;
  fact: RelationFactSummary | null;
  x: number;
  y: number;
  degree: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: Relation;
};

const WIDTH = 900;
const HEIGHT = 560;
const PADDING = 28;
const IDEAL_EDGE = 70;
const COMPONENT_GAP = 50;
const ITERATIONS = 250;

/**
 * 외부 라이브러리 없이 그래프를 SVG로 그린다.
 * 연결 요소(서로 이어진 사실 묶음)마다 force-directed 배치를 따로 계산한 뒤
 * 큰 묶음부터 선반(shelf) 방식으로 캔버스에 채운다. 작은 짝이 많아도 겹치지 않는다.
 * 노드 = 사실, 간선 = 관계, 같은 기사에서 나온 사실은 같은 색이다.
 */
function layout(relations: Relation[]) {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, string[]>();

  function ensure(id: string, fact: RelationFactSummary | null | undefined) {
    const existing = nodeMap.get(id);

    if (existing !== undefined) {
      existing.degree += 1;

      return;
    }

    nodeMap.set(id, { id, fact: fact ?? null, x: 0, y: 0, degree: 1 });
    adjacency.set(id, []);
  }

  for (const relation of relations) {
    ensure(relation.factIdA, relation.factA);
    ensure(relation.factIdB, relation.factB);
    edges.push({
      id: relation.id,
      source: relation.factIdA,
      target: relation.factIdB,
      relation,
    });
    adjacency.get(relation.factIdA)?.push(relation.factIdB);
    adjacency.get(relation.factIdB)?.push(relation.factIdA);
  }

  const components = findComponents(nodeMap, adjacency);
  const boxes = components.map((members) => layoutComponent(members, edges));

  packComponents(boxes);
  fitToCanvas([...nodeMap.values()]);

  return { nodes: [...nodeMap.values()], edges };
}

function findComponents(
  nodeMap: Map<string, GraphNode>,
  adjacency: Map<string, string[]>,
): GraphNode[][] {
  const seen = new Set<string>();
  const components: GraphNode[][] = [];

  for (const id of nodeMap.keys()) {
    if (seen.has(id)) {
      continue;
    }

    const stack = [id];
    const members: GraphNode[] = [];
    seen.add(id);

    while (stack.length > 0) {
      // SAFETY: the loop condition guarantees the stack is non-empty here.
      const current = stack.pop() as string;
      const node = nodeMap.get(current);

      if (node !== undefined) {
        members.push(node);
      }

      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }

    components.push(members);
  }

  return components.sort((a, b) => b.length - a.length);
}

type ComponentBox = { members: GraphNode[]; width: number; height: number };

/** 한 연결 요소를 (0,0) 기준 로컬 좌표에 배치하고 크기를 돌려준다. */
function layoutComponent(
  members: GraphNode[],
  allEdges: GraphEdge[],
): ComponentBox {
  if (members.length === 1) {
    members[0].x = 0;
    members[0].y = 0;

    return { members, width: 0, height: 0 };
  }

  const ids = new Set(members.map((node) => node.id));

  const edges = allEdges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );

  const byId = new Map(members.map((node) => [node.id, node]));

  // 결정적인 초기 위치(골든 앵글 나선)로 렌더마다 모양이 같게 한다.
  members.forEach((node, index) => {
    const angle = index * 2.399963;
    const radius = IDEAL_EDGE * 0.5 * Math.sqrt(index + 1);
    node.x = Math.cos(angle) * radius;
    node.y = Math.sin(angle) * radius;
  });

  const k = IDEAL_EDGE;
  let temperature = IDEAL_EDGE;

  for (let iter = 0; iter < ITERATIONS; iter += 1) {
    const fx = new Map<string, number>();
    const fy = new Map<string, number>();

    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        const ddx = a.x - b.x;
        const ddy = a.y - b.y;
        const dist = Math.max(0.01, Math.hypot(ddx, ddy));
        const force = (k * k) / dist;
        fx.set(a.id, (fx.get(a.id) ?? 0) + (ddx / dist) * force);
        fy.set(a.id, (fy.get(a.id) ?? 0) + (ddy / dist) * force);
        fx.set(b.id, (fx.get(b.id) ?? 0) - (ddx / dist) * force);
        fy.set(b.id, (fy.get(b.id) ?? 0) - (ddy / dist) * force);
      }
    }

    for (const edge of edges) {
      const a = byId.get(edge.source);
      const b = byId.get(edge.target);

      if (a === undefined || b === undefined || a === b) {
        continue;
      }

      const ddx = a.x - b.x;
      const ddy = a.y - b.y;
      const dist = Math.max(0.01, Math.hypot(ddx, ddy));
      const force = (dist * dist) / k;
      fx.set(a.id, (fx.get(a.id) ?? 0) - (ddx / dist) * force);
      fy.set(a.id, (fy.get(a.id) ?? 0) - (ddy / dist) * force);
      fx.set(b.id, (fx.get(b.id) ?? 0) + (ddx / dist) * force);
      fy.set(b.id, (fy.get(b.id) ?? 0) + (ddy / dist) * force);
    }

    for (const node of members) {
      const mx = fx.get(node.id) ?? 0;
      const my = fy.get(node.id) ?? 0;
      const len = Math.max(0.01, Math.hypot(mx, my));
      const step = Math.min(len, temperature);
      node.x += (mx / len) * step;
      node.y += (my / len) * step;
    }

    temperature = Math.max(1, temperature * 0.96);
  }

  const bounds = boundsOf(members);

  for (const node of members) {
    node.x -= bounds.minX;
    node.y -= bounds.minY;
  }

  return {
    members,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/** 큰 묶음부터 왼쪽→오른쪽, 위→아래로 채운다. 줄 폭은 캔버스 비율에 맞춘다. */
function packComponents(boxes: ComponentBox[]): void {
  const totalArea = boxes.reduce(
    (sum, box) =>
      sum + (box.width + COMPONENT_GAP) * (box.height + COMPONENT_GAP),
    0,
  );

  const rowWidth = Math.max(
    boxes[0] === undefined ? 0 : boxes[0].width + COMPONENT_GAP,
    Math.sqrt(totalArea * (WIDTH / HEIGHT)),
  );

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const box of boxes) {
    if (cursorX > 0 && cursorX + box.width > rowWidth) {
      cursorX = 0;
      cursorY += rowHeight + COMPONENT_GAP;
      rowHeight = 0;
    }

    for (const node of box.members) {
      node.x += cursorX;
      node.y += cursorY;
    }

    cursorX += box.width + COMPONENT_GAP;
    rowHeight = Math.max(rowHeight, box.height);
  }
}

function boundsOf(nodes: GraphNode[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }

  return { minX, maxX, minY, maxY };
}

/** 전체 배치를 캔버스에 맞춘다. 노드가 적을 때 과하게 커지지 않도록 2배까지만 키운다. */
function fitToCanvas(nodes: GraphNode[]): void {
  if (nodes.length === 0) {
    return;
  }

  const { minX, maxX, minY, maxY } = boundsOf(nodes);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const scale = Math.min(
    2,
    (WIDTH - PADDING * 2) / spanX,
    (HEIGHT - PADDING * 2) / spanY,
  );

  const offsetX = (WIDTH - spanX * scale) / 2;
  const offsetY = (HEIGHT - spanY * scale) / 2;

  for (const node of nodes) {
    node.x = offsetX + (node.x - minX) * scale;
    node.y = offsetY + (node.y - minY) * scale;
  }
}

const PALETTE = [
  '#245b6b',
  '#8a5a1f',
  '#5b3f8c',
  '#2f6b3a',
  '#8f2d4f',
  '#3d5a99',
  '#7a6a1f',
  '#1f6b6b',
];

function colorFor(articleId: string | undefined, index: Map<string, number>) {
  if (articleId === undefined) {
    return '#8a8378';
  }

  if (!index.has(articleId)) {
    index.set(articleId, index.size);
  }

  return PALETTE[(index.get(articleId) ?? 0) % PALETTE.length];
}

export function FactGraph(props: { relations: Relation[] }) {
  const { nodes, edges } = useMemo(
    () => layout(props.relations),
    [props.relations],
  );

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);

  const colorIndex = new Map<string, number>();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const activeNode = selectedNode === null ? null : nodeById.get(selectedNode);
  const activeEdge = edges.find((edge) => edge.id === selectedEdge) ?? null;

  if (nodes.length === 0) {
    return <p className="meta">그릴 관계가 없습니다.</p>;
  }

  return (
    <div className="graph-layout">
      <svg
        className="fact-graph"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="사실-관계 그래프"
      >
        {edges.map((edge) => {
          const a = nodeById.get(edge.source);
          const b = nodeById.get(edge.target);

          if (a === undefined || b === undefined) {
            return null;
          }

          const contradictory =
            edge.relation.relationType === 'contradictory_claims';

          const highlighted =
            edge.id === selectedEdge ||
            edge.source === selectedNode ||
            edge.target === selectedNode;

          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`graph-edge${contradictory ? ' graph-edge-conflict' : ''}${edge.relation.isInferred ? ' graph-edge-inferred' : ''}${highlighted ? ' graph-edge-active' : ''}`}
              onClick={() => {
                setSelectedEdge(edge.id);
                setSelectedNode(null);
              }}
            >
              <title>{labels.relationType(edge.relation.relationType).label}</title>
            </line>
          );
        })}
        {nodes.map((node) => (
          <g
            key={node.id}
            className={`graph-node${node.id === selectedNode ? ' graph-node-active' : ''}`}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => {
              setSelectedNode(node.id);
              setSelectedEdge(null);
            }}
          >
            <circle
              r={6 + Math.min(8, node.degree * 1.5)}
              fill={colorFor(node.fact?.articleId, colorIndex)}
            />
            <title>{node.fact?.statement ?? node.id}</title>
          </g>
        ))}
      </svg>

      <aside className="panel graph-side">
        <p className="meta">
          노드 {nodes.length}개 · 관계 {edges.length}개. 색은 출처 기사, 빨간
          선은 상충 주장, 점선은 추론이 섞인 관계입니다.
        </p>
        {activeNode ? (
          <>
            <h3>사실</h3>
            <p>{activeNode.fact?.statement ?? activeNode.id}</p>
            {activeNode.fact ? (
              <p className="meta">
                {activeNode.fact.publisher ?? '언론사 미상'} ·{' '}
                <Link to={`/news/${activeNode.fact.articleId}`}>
                  {truncate(activeNode.fact.articleTitle ?? '기사', 40)}
                </Link>
              </p>
            ) : null}
            <p className="meta">연결 {activeNode.degree}개</p>
          </>
        ) : null}
        {activeEdge ? (
          <>
            <h3>{labels.relationType(activeEdge.relation.relationType).label}</h3>
            <p>{activeEdge.relation.description}</p>
            <p className="meta">근거: {activeEdge.relation.rationale}</p>
            <p className="meta">
              불확실성 {labels.uncertainty(activeEdge.relation.uncertainty).label}
            </p>
          </>
        ) : null}
        {activeNode === null && activeEdge === null ? (
          <p className="meta">노드나 선을 클릭하면 내용이 여기에 표시됩니다.</p>
        ) : null}
      </aside>
    </div>
  );
}
