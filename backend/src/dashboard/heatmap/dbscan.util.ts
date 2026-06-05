import { DieCell, Cluster } from './heatmap.dto';

export interface DBSCANPoint {
  x: number;
  y: number;
  index: number;
}

export function runDBSCAN(
  points: DBSCANPoint[],
  eps: number = 2,
  minPoints: number = 3,
): number[][] {
  const clusters: number[][] = [];
  const visited = new Set<number>();
  const clustered = new Set<number>();

  const getNeighbors = (p: DBSCANPoint) => {
    return points.filter((other) => {
      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= eps;
    });
  };

  const expandCluster = (
    pointIdx: number,
    neighbors: DBSCANPoint[],
    cluster: number[],
  ) => {
    cluster.push(pointIdx);
    clustered.add(pointIdx);

    const queue = [...neighbors];
    let qIdx = 0;

    while (qIdx < queue.length) {
      const neighbor = queue[qIdx];
      qIdx++;

      if (!visited.has(neighbor.index)) {
        visited.add(neighbor.index);
        const nextNeighbors = getNeighbors(neighbor);

        if (nextNeighbors.length >= minPoints) {
          queue.push(...nextNeighbors.filter(n => !queue.some(q => q.index === n.index)));
        }
      }

      if (!clustered.has(neighbor.index)) {
        cluster.push(neighbor.index);
        clustered.add(neighbor.index);
      }
    }
  };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (visited.has(p.index)) continue;

    visited.add(p.index);
    const neighbors = getNeighbors(p);

    if (neighbors.length >= minPoints) {
      const cluster: number[] = [];
      expandCluster(p.index, neighbors, cluster);
      clusters.push(cluster);
    }
  }

  return clusters;
}

export function fitLinearRegression(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  const N = points.length;
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / N;
  const meanY = sumY / N;

  let cov = 0;
  let varX = 0;
  let varY = 0;

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) {
    return 1; // Perfect vertical or horizontal line
  }

  return (cov * cov) / (varX * varY);
}

export function classifyCluster(
  clusterDies: DieCell[],
  maxX: number,
  maxY: number,
): Cluster {
  const dieCount = clusterDies.length;
  const avgCost = clusterDies.reduce((acc, d) => acc + d.costPerDie, 0) / dieCount;

  // 1. Check for Edge Ring
  let edgeCount = 0;
  for (const d of clusterDies) {
    if (d.x <= 2 || d.x >= maxX - 2 || d.y <= 2 || d.y >= maxY - 2) {
      edgeCount++;
    }
  }
  const edgeRatio = edgeCount / dieCount;

  // 2. Check for Center Point
  const meanX = clusterDies.reduce((acc, d) => acc + d.x, 0) / dieCount;
  const meanY = clusterDies.reduce((acc, d) => acc + d.y, 0) / dieCount;
  const centerX = maxX / 2;
  const centerY = maxY / 2;
  const distToCenter = Math.sqrt((meanX - centerX) * (meanX - centerX) + (meanY - centerY) * (meanY - centerY));

  // 3. Check for Linear Scratch (fit line and check R2)
  const r2 = fitLinearRegression(clusterDies);

  let type: Cluster['type'] = 'random';
  let aiProbability = 0.40;

  if (edgeRatio >= 0.35) {
    type = 'edge_ring';
    aiProbability = Math.min(1.0, 0.85 + dieCount / 100);
  } else if (r2 >= 0.80) {
    type = 'linear_scratch';
    aiProbability = 0.92;
  } else if (distToCenter <= Math.max(maxX, maxY) * 0.20) {
    type = 'center_point';
    aiProbability = 0.75;
  }

  return {
    type,
    dieCount,
    avgCost: parseFloat(avgCost.toFixed(4)),
    aiProbability: parseFloat(aiProbability.toFixed(2)),
  };
}
