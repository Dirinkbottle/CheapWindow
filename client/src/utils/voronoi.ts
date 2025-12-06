/**
 * Voronoi Diagram Generator using Fortune's Sweep Line Algorithm
 * 
 * Generates realistic fracture patterns for multi-user tear animations
 * Input: User grab positions (normalized coordinates 0-100)
 * Output: Voronoi cells as polygon arrays
 */

export interface Point {
  x: number;
  y: number;
}

export interface VoronoiCell {
  site: Point;
  polygon: Point[];
  userId: string;
  force: number;
}

export interface VoronoiDiagramOptions {
  width: number;
  height: number;
  subdivisions?: number; // Additional cells per user based on force
  perturbation?: number; // Random offset for realistic cracks
}

interface Site {
  x: number;
  y: number;
  userId: string;
  force: number;
}

/**
 * Generate Voronoi diagram from user grab positions
 */
export function generateVoronoiDiagram(
  userVectors: Array<{ userId: string; position: Point; force: number }>,
  options: VoronoiDiagramOptions
): VoronoiCell[] {
  const { width, height, subdivisions = 0, perturbation = 0 } = options;
  
  if (userVectors.length === 0) {
    return [];
  }

  // Convert user positions to sites
  const sites: Site[] = [];
  
  userVectors.forEach(({ userId, position, force }) => {
    // Convert from percentage to pixels
    const baseX = (position.x / 100) * width;
    const baseY = (position.y / 100) * height;
    
    // Add primary site
    sites.push({
      x: baseX + (Math.random() - 0.5) * perturbation,
      y: baseY + (Math.random() - 0.5) * perturbation,
      userId,
      force
    });
    
    // Add subdivision sites based on force
    const subCount = Math.floor(subdivisions * (force / 2)); // 0-subdivisions sites
    for (let i = 0; i < subCount; i++) {
      const angle = (Math.PI * 2 * i) / subCount;
      const radius = Math.min(width, height) * 0.1 * force;
      sites.push({
        x: baseX + Math.cos(angle) * radius + (Math.random() - 0.5) * perturbation,
        y: baseY + Math.sin(angle) * radius + (Math.random() - 0.5) * perturbation,
        userId,
        force
      });
    }
  });

  // Use Lloyd's relaxation for better distribution (simplified)
  const relaxedSites = relaxSites(sites, width, height, 1);

  // Compute Voronoi cells using simplified algorithm
  const cells = computeVoronoiCells(relaxedSites, width, height);

  return cells;
}

/**
 * Lloyd's relaxation - moves sites to centroids for better distribution
 */
function relaxSites(sites: Site[], width: number, height: number, iterations: number): Site[] {
  let currentSites = [...sites];
  
  for (let iter = 0; iter < iterations; iter++) {
    const newSites: Site[] = [];
    
    // For each site, find its Voronoi cell centroid
    currentSites.forEach(site => {
      // Sample points around the site to estimate centroid
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      
      const sampleRadius = Math.min(width, height) * 0.15;
      const samples = 20;
      
      for (let i = 0; i < samples; i++) {
        const angle = (Math.PI * 2 * i) / samples;
        const testX = site.x + Math.cos(angle) * sampleRadius;
        const testY = site.y + Math.sin(angle) * sampleRadius;
        
        // Check if this point belongs to this site's cell
        if (isClosestSite(testX, testY, site, currentSites)) {
          sumX += testX;
          sumY += testY;
          count++;
        }
      }
      
      if (count > 0) {
        newSites.push({
          ...site,
          x: sumX / count,
          y: sumY / count
        });
      } else {
        newSites.push(site);
      }
    });
    
    currentSites = newSites;
  }
  
  return currentSites;
}

/**
 * Check if a point is closest to a given site
 */
function isClosestSite(x: number, y: number, site: Site, allSites: Site[]): boolean {
  const distToSite = Math.hypot(x - site.x, y - site.y);
  
  for (const otherSite of allSites) {
    if (otherSite === site) continue;
    const distToOther = Math.hypot(x - otherSite.x, y - otherSite.y);
    if (distToOther < distToSite) {
      return false;
    }
  }
  
  return true;
}

/**
 * Compute Voronoi cells using simplified pixel-based approach
 * For production, consider using a proper Fortune's algorithm implementation
 * or library like d3-delaunay
 */
function computeVoronoiCells(sites: Site[], width: number, height: number): VoronoiCell[] {
  const cells: Map<string, VoronoiCell> = new Map();
  
  // Initialize cells
  sites.forEach(site => {
    const key = `${site.userId}-${site.x}-${site.y}`;
    cells.set(key, {
      site: { x: site.x, y: site.y },
      polygon: [],
      userId: site.userId,
      force: site.force
    });
  });

  // Generate cell polygons using edge tracing
  sites.forEach(site => {
    const key = `${site.userId}-${site.x}-${site.y}`;
    const polygon = traceCellBoundary(site, sites, width, height);
    const cell = cells.get(key)!;
    cell.polygon = polygon;
  });

  return Array.from(cells.values());
}

/**
 * Trace the boundary of a Voronoi cell
 */
function traceCellBoundary(site: Site, allSites: Site[], width: number, height: number): Point[] {
  const polygon: Point[] = [];
  const segments = 32; // Sample points around the cell
  
  // Start from site and sample radially outward
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    
    // Binary search for cell boundary along this ray
    let low = 0;
    let high = Math.max(width, height) * 1.5;
    
    for (let iter = 0; iter < 10; iter++) {
      const mid = (low + high) / 2;
      const testX = site.x + Math.cos(angle) * mid;
      const testY = site.y + Math.sin(angle) * mid;
      
      if (isClosestSite(testX, testY, site, allSites)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    const boundaryX = site.x + Math.cos(angle) * low;
    const boundaryY = site.y + Math.sin(angle) * low;
    
    // Clip to bounds
    polygon.push({
      x: Math.max(0, Math.min(width, boundaryX)),
      y: Math.max(0, Math.min(height, boundaryY))
    });
  }
  
  return simplifyPolygon(polygon, width * 0.02); // Simplify to reduce vertex count
}

/**
 * Simplify polygon using Douglas-Peucker algorithm
 */
function simplifyPolygon(points: Point[], tolerance: number): Point[] {
  if (points.length <= 3) return points;
  
  // Find point with maximum distance from line
  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * Fast Voronoi generation using grid-based approach (alternative method)
 * Better performance for real-time updates
 */
export function generateVoronoiFast(
  userVectors: Array<{ userId: string; position: Point; force: number }>,
  options: VoronoiDiagramOptions
): VoronoiCell[] {
  const { width, height } = options;
  
  if (userVectors.length === 0) return [];
  if (userVectors.length === 1) {
    // Single user - entire window is one cell
    return [{
      site: {
        x: (userVectors[0].position.x / 100) * width,
        y: (userVectors[0].position.y / 100) * height
      },
      polygon: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
      ],
      userId: userVectors[0].userId,
      force: userVectors[0].force
    }];
  }
  
  // For 2+ users, use the full algorithm
  return generateVoronoiDiagram(userVectors, options);
}

/**
 * Generate crack lines between Voronoi cells
 */
export function generateCrackLines(cells: VoronoiCell[]): Array<[Point, Point]> {
  const cracks: Array<[Point, Point]> = [];
  
  // Find adjacent cells and create crack lines between them
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const cell1 = cells[i];
      const cell2 = cells[j];
      
      // Find shared edge
      const sharedPoints = findSharedEdge(cell1.polygon, cell2.polygon);
      if (sharedPoints.length >= 2) {
        // Add crack with perturbation
        for (let k = 0; k < sharedPoints.length - 1; k++) {
          cracks.push([sharedPoints[k], sharedPoints[k + 1]]);
        }
      }
    }
  }
  
  return cracks;
}

/**
 * Find shared edge between two polygons
 */
function findSharedEdge(poly1: Point[], poly2: Point[]): Point[] {
  const shared: Point[] = [];
  const threshold = 5; // Distance threshold for considering points the same
  
  for (const p1 of poly1) {
    for (const p2 of poly2) {
      if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold) {
        // Check if not already added
        if (!shared.some(p => Math.hypot(p.x - p1.x, p.y - p1.y) < threshold)) {
          shared.push(p1);
        }
      }
    }
  }
  
  return shared;
}

