import React, { useEffect, useRef } from 'react';

export default function Space3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ── 3D Starfield & Floating Particles ──────────────────────────────────────
    const STAR_COUNT = 90;
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 1.8,
        y: (Math.random() - 0.5) * height * 1.8,
        z: Math.random() * 900 + 100,
        size: Math.random() * 1.8 + 0.8,
        color: i % 4 === 0 ? 'rgba(99, 102, 241, ' : (i % 4 === 1 ? 'rgba(168, 85, 247, ' : (i % 4 === 2 ? 'rgba(6, 182, 212, ' : 'rgba(255, 255, 255, ')),
        speed: Math.random() * 0.4 + 0.2
      });
    }

    // ── 3D Geometric Objects (Wireframe Icosahedron / Octahedron) ─────────────
    // 3D vertices for an octahedron
    const octaVertices = [
      { x: 0, y: -70, z: 0 },
      { x: 70, y: 0, z: 0 },
      { x: 0, y: 70, z: 0 },
      { x: -70, y: 0, z: 0 },
      { x: 0, y: 0, z: 70 },
      { x: 0, y: 0, z: -70 },
    ];
    const octaEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // middle ring
      [0, 4], [1, 4], [2, 4], [3, 4], // top pyramid
      [0, 5], [1, 5], [2, 5], [3, 5], // bottom pyramid
    ];

    // 3D vertices for a small rotating cube
    const cubeVertices = [
      { x: -35, y: -35, z: -35 },
      { x: 35, y: -35, z: -35 },
      { x: 35, y: 35, z: -35 },
      { x: -35, y: 35, z: -35 },
      { x: -35, y: -35, z: 35 },
      { x: 35, y: -35, z: 35 },
      { x: 35, y: 35, z: 35 },
      { x: -35, y: 35, z: 35 },
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    // Shape 3: 3D Wireframe Hexagonal Orbital Prism
    const ringVertices = [];
    const ringEdges = [];
    const segments = 6;
    const radius = 42;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ringVertices.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, z: -16 });
      ringVertices.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, z: 16 });
      const nextI = (i + 1) % segments;
      ringEdges.push([i * 2, nextI * 2]);
      ringEdges.push([i * 2 + 1, nextI * 2 + 1]);
      ringEdges.push([i * 2, i * 2 + 1]);
    }

    let rotX = 0;
    let rotY = 0;
    let rotZ = 0;

    const project = (x, y, z, cx, cy, fov = 450) => {
      const scale = fov / (fov + z);
      return {
        x: cx + x * scale,
        y: cy + y * scale,
        scale,
        alpha: Math.min(Math.max((fov + z) / (fov * 1.5), 0.1), 0.9)
      };
    };

    const rotate3D = (point, ax, ay, az) => {
      let y1 = point.y * Math.cos(ax) - point.z * Math.sin(ax);
      let z1 = point.y * Math.sin(ax) + point.z * Math.cos(ax);
      let x2 = point.x * Math.cos(ay) + z1 * Math.sin(ay);
      let z2 = -point.x * Math.sin(ay) + z1 * Math.cos(ay);
      let x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
      let y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
      return { x: x3, y: y3, z: z2 };
    };

    const render = () => {
      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Parallax offsets
      const offsetX = (mouseX - width / 2) * 0.06;
      const offsetY = (mouseY - height / 2) * 0.06;

      // ── Atmospheric Luminous Space Nebulae (Dynamic Gradient Background) ─────
      const grad1 = ctx.createRadialGradient(
        width * 0.82 + offsetX * 0.5, height * 0.22 + offsetY * 0.5, 10,
        width * 0.82 + offsetX * 0.5, height * 0.22 + offsetY * 0.5, 500
      );
      grad1.addColorStop(0, 'rgba(129, 140, 248, 0.14)');
      grad1.addColorStop(0.5, 'rgba(168, 85, 247, 0.06)');
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.18 + offsetX * 0.4, height * 0.78 + offsetY * 0.4, 10,
        width * 0.18 + offsetX * 0.4, height * 0.78 + offsetY * 0.4, 450
      );
      grad2.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
      grad2.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // ── Draw 3D Stars ────────────────────────────────────────────────────────
      const cx = width / 2 + offsetX;
      const cy = height / 2 + offsetY;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.z -= star.speed;
        if (star.z <= 10) {
          star.z = 900;
          star.x = (Math.random() - 0.5) * width * 1.8;
          star.y = (Math.random() - 0.5) * height * 1.8;
        }

        const proj = project(star.x, star.y, star.z, cx, cy, 500);
        if (proj.x >= 0 && proj.x <= width && proj.y >= 0 && proj.y <= height) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(0.7, star.size * proj.scale), 0, Math.PI * 2);
          ctx.fillStyle = `${star.color}${Math.min(1, proj.scale * 1.3)})`;
          ctx.fill();
        }
      }

      // ── Draw Floating 3D Geometric Objects ──────────────────────────────────
      rotX += 0.003;
      rotY += 0.005;
      rotZ += 0.002;

      // Shape 1: Floating Octahedron (Indigo / Violet Glow)
      const shape1Center = {
        x: width * 0.84 + offsetX * 0.5,
        y: height * 0.22 + offsetY * 0.5
      };

      const transformedOcta = octaVertices.map(v => {
        const r = rotate3D(v, rotX, rotY, rotZ);
        return project(r.x, r.y, r.z + 100, shape1Center.x, shape1Center.y, 450);
      });

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.35)';
      ctx.beginPath();
      for (const [i, j] of octaEdges) {
        const p1 = transformedOcta[i];
        const p2 = transformedOcta[j];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      for (const p of transformedOcta) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Shape 2: Floating Cube (Cyan / Emerald Glow)
      const shape2Center = {
        x: width * 0.16 + offsetX * 0.3,
        y: height * 0.78 + offsetY * 0.3
      };

      const transformedCube = cubeVertices.map(v => {
        const r = rotate3D(v, -rotY * 0.8, rotX * 1.1, rotZ);
        return project(r.x, r.y, r.z + 120, shape2Center.x, shape2Center.y, 450);
      });

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.32)';
      ctx.beginPath();
      for (const [i, j] of cubeEdges) {
        const p1 = transformedCube[i];
        const p2 = transformedCube[j];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      for (const p of transformedCube) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.0 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Shape 3: Floating Hexagonal Prism (Rose / Amber Glow)
      const shape3Center = {
        x: width * 0.52 + offsetX * 0.2,
        y: height * 0.92 + offsetY * 0.2
      };

      const transformedRing = ringVertices.map(v => {
        const r = rotate3D(v, rotZ * 1.2, rotX * 0.7, rotY * 0.9);
        return project(r.x, r.y, r.z + 140, shape3Center.x, shape3Center.y, 450);
      });

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.28)';
      ctx.beginPath();
      for (const [i, j] of ringEdges) {
        const p1 = transformedRing[i];
        const p2 = transformedRing[j];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      for (const p of transformedRing) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85
      }}
    />
  );
}
