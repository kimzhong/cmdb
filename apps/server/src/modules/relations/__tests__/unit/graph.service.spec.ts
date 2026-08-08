/**
 * GraphService 单元测试
 * 验证图遍历/路径/影响分析/环检测的正确性
 */
import { GraphService, RelationEdge } from '../../domain/graph.service';

const g = new GraphService();
const e = (over: Partial<RelationEdge>): RelationEdge => ({
  id: over.id ?? `edge_${Math.random().toString(36).slice(2, 8)}`,
  sourceId: '',
  sourceType: 'resource',
  targetId: '',
  targetType: 'resource',
  relationType: 'depends_on',
  status: 'active',
  isBidirectional: false,
  ...over,
});

describe('GraphService', () => {
  // A -> B -> C
  // |         ^
  // +---------+
  const edges: RelationEdge[] = [
    e({ id: 'e1', sourceId: 'A', targetId: 'B', relationType: 'depends_on' }),
    e({ id: 'e2', sourceId: 'B', targetId: 'C', relationType: 'depends_on' }),
    e({ id: 'e3', sourceId: 'A', targetId: 'C', relationType: 'runs_on' }),
  ];

  describe('traverse', () => {
    it('given A with maxDepth=1 then returns [A, B, C] (A→B direct, A→C direct)', () => {
      const nodes = g.traverse('A', 'resource', edges, { direction: 'both', maxDepth: 1 });
      const ids = nodes.map((n) => n.label).sort();
      expect(ids).toEqual(['A', 'B', 'C']);
    });

    it('given A with maxDepth=0 then returns only [A]', () => {
      const nodes = g.traverse('A', 'resource', edges, { direction: 'both', maxDepth: 0 });
      expect(nodes.map((n) => n.label)).toEqual(['A']);
    });

    it('given relationTypes filter then respects it', () => {
      const nodes = g.traverse('A', 'resource', edges, { direction: 'both', maxDepth: 2, relationTypes: ['depends_on'] });
      const ids = nodes.map((n) => n.label).sort();
      // A->B (depends_on), A->C filtered out, B->C (depends_on)
      expect(ids).toEqual(['A', 'B', 'C']);
    });
  });

  describe('findPath', () => {
    it('given A to C direct then returns 1-step path', () => {
      const path = g.findPath('A', 'resource', 'C', 'resource', edges, { maxDepth: 5 });
      expect(path).not.toBeNull();
      expect(path!.totalLength).toBe(1);
      expect(path!.nodes[0].label).toBe('A');
      expect(path!.nodes[path!.nodes.length - 1].label).toBe('C');
    });

    it('given A to C (direct removed) then BFS finds A->B->C', () => {
      const subset = edges.filter((x) => x.id !== 'e3');
      const path = g.findPath('A', 'resource', 'C', 'resource', subset, { maxDepth: 5 });
      expect(path).not.toBeNull();
      expect(path!.totalLength).toBe(2);
      expect(path!.nodes.map((n) => n.label)).toEqual(['A', 'B', 'C']);
    });

    it('given no path then returns null', () => {
      const isolated = e({ id: 'iso', sourceId: 'X', targetId: 'Y' });
      const path = g.findPath('A', 'resource', 'Y', 'resource', [isolated], { maxDepth: 5 });
      expect(path).toBeNull();
    });

    it('given same from and to then returns zero-length path', () => {
      const path = g.findPath('A', 'resource', 'A', 'resource', edges, { maxDepth: 5 });
      expect(path).not.toBeNull();
      expect(path!.totalLength).toBe(0);
    });
  });

  describe('impactAnalysis', () => {
    it('given A with maxDepth=2 then returns all reachable nodes except A', () => {
      const impacted = g.impactAnalysis('A', 'resource', edges, { maxDepth: 2 });
      expect(impacted.sort()).toEqual(['B', 'C']);
    });

    it('given C (no outgoing) with undirected reach then returns ancestors [A, B]', () => {
      // impact 是双向可达:沿反向边也能走
      const impacted = g.impactAnalysis('C', 'resource', edges, { maxDepth: 3 });
      expect(impacted.sort()).toEqual(['A', 'B']);
    });
  });

  describe('detectCycle', () => {
    it('given self-loop then returns hasCycle', () => {
      const r = g.detectCycle('A', 'resource', 'A', 'resource', []);
      expect(r.hasCycle).toBe(true);
    });

    it('given back-edge C->A then adding A->C would cycle', () => {
      const withBack = [...edges, e({ id: 'back', sourceId: 'C', targetId: 'A' })];
      const r = g.detectCycle('A', 'resource', 'C', 'resource', withBack);
      expect(r.hasCycle).toBe(true);
    });

    it('given acyclic then returns no cycle', () => {
      const r = g.detectCycle('A', 'resource', 'D', 'resource', edges);
      expect(r.hasCycle).toBe(false);
    });
  });
});
