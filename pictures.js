// Outline pictures. Each is a list of SVG path strings in a 100 x 100 box.
// Shapes are closed so the paint bucket can fill each region.
(function () {
  const f = (n) => +n.toFixed(2);
  const circle = (cx, cy, r) =>
    `M${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 1 ${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 1 ${f(cx + r)} ${f(cy)} Z`;

  // Flower petals: arcs bulging outward between points on a ring around the center.
  function petals(cx, cy, ring, count, bulge, startDeg) {
    let d = '';
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = (startDeg + (360 / count) * i) * Math.PI / 180;
      pts.push([cx + ring * Math.cos(a), cy + ring * Math.sin(a)]);
    }
    d += `M${f(pts[0][0])} ${f(pts[0][1])} `;
    for (let i = 1; i <= count; i++) {
      const p = pts[i % count];
      d += `A${bulge} ${bulge} 0 1 1 ${f(p[0])} ${f(p[1])} `;
    }
    return d + 'Z';
  }

  // Sun rays: separate little triangles around the face.
  function rays(cx, cy, r1, r2, count, halfDeg) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (360 / count) * i * Math.PI / 180, h = halfDeg * Math.PI / 180;
      const p1 = [cx + r1 * Math.cos(a - h), cy + r1 * Math.sin(a - h)];
      const p2 = [cx + r1 * Math.cos(a + h), cy + r1 * Math.sin(a + h)];
      const t = [cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)];
      out.push(`M${f(p1[0])} ${f(p1[1])} L${f(t[0])} ${f(t[1])} L${f(p2[0])} ${f(p2[1])} Z`);
    }
    return out;
  }

  window.PICTURES = [
    {
      id: 'cat', name: '貓咪',
      paths: [
        'M30 40 L28 18 L42 30 Q50 28 58 30 L72 18 L70 40 Q74 58 50 60 Q26 58 30 40 Z',
        'M33 36 L32 25 L39 31 Z', 'M67 36 L68 25 L61 31 Z',
        circle(41, 42, 3.2), circle(59, 42, 3.2),
        'M47 48.5 L53 48.5 L50 52 Z',
        'M50 52 Q48 56 44.5 54.5 M50 52 Q52 56 55.5 54.5',
        'M35 49 L23 47 M35 52.5 L23 55 M65 49 L77 47 M65 52.5 L77 55',
        'M39.8 58 Q28 78 34 92 L66 92 Q72 78 60.2 58',
        'M43 92 L43 84 Q46 80 49 84 L49 92 M51 92 L51 84 Q54 80 57 84 L57 92',
        'M68.5 84 Q88 86 84 64 Q83 59 79 62 Q82 78 68.7 77',
      ],
    },
    {
      id: 'house', name: '房子',
      paths: [
        'M22 50 L22 90 L78 90 L78 50',
        'M14 52 L50 18 L86 52 Z',
        'M64 31.2 L64 20 L72 20 L72 38.8',
        'M42 90 L42 70 Q50 62 58 70 L58 90',
        'M27 58 L37 58 L37 69 L27 69 Z M32 58 L32 69 M27 63.5 L37 63.5',
        'M63 58 L73 58 L73 69 L63 69 Z M68 58 L68 69 M63 63.5 L73 63.5',
        circle(50, 38, 5),
        'M6 90 L94 90',
      ],
    },
    {
      id: 'flower', name: '花',
      paths: [
        circle(50, 34, 9),
        petals(50, 34, 9, 6, 7.5, 90),
        'M50 43 L50 80',
        'M50 70 Q36 58 27 65 Q37 77 50 70 Z',
        'M50 62 Q64 50 73 56 Q63 68 50 62 Z',
        'M34 80 L66 80 L61 95 L39 95 Z',
        'M36 86 L64 86',
      ],
    },
    {
      id: 'fish', name: '魚',
      paths: [
        'M20 50 Q40 26 66 40 L84 28 L80 50 L84 72 L66 60 Q40 74 20 50 Z',
        'M66 40 Q62 50 66 60',
        'M37 36.9 Q43 50 37 63.1',
        'M41.5 35.5 Q46 21 53.4 35.4',
        'M41.5 64.5 Q46 76 53.4 64.6',
        circle(29, 47, 3),
        'M22 53 Q25 55 28 54',
        circle(90, 20, 3.5), circle(85, 10, 2.2), circle(93, 6, 1.6),
      ],
    },
    {
      id: 'butterfly', name: '蝴蝶',
      paths: [
        'M54 52 A4 22 0 1 1 46 52 A4 22 0 1 1 54 52 Z',
        'M46.3 44 Q28 8 14 23 Q5 44 46 52',
        'M46 55 Q12 56 20 77 Q30 90 46.4 62',
        'M53.7 44 Q72 8 86 23 Q95 44 54 52',
        'M54 55 Q88 56 80 77 Q70 90 53.6 62',
        circle(28, 32, 5.5), circle(72, 32, 5.5), circle(30, 72, 3.5), circle(70, 72, 3.5),
        'M48.5 30.4 Q45 18 38.5 14.5 M51.5 30.4 Q55 18 61.5 14.5',
        circle(37, 13.5, 2.2), circle(63, 13.5, 2.2),
      ],
    },
    {
      id: 'sun', name: '太陽',
      paths: [
        circle(50, 50, 21),
        ...rays(50, 50, 25, 40, 10, 9),
        circle(42.5, 45, 2.5), circle(57.5, 45, 2.5),
        'M41 55 Q50 64 59 55',
        circle(37, 54, 2.5), circle(63, 54, 2.5),
      ],
    },
    {
      id: 'car', name: '汽車',
      paths: [
        'M10 70 L10 57 Q11 50 22 50 L31 50 L39 36 Q41 34 45 34 L65 34 Q69 34 71 37 L80 50 Q90 50 90 58 L90 70 L81 70 M63 70 L37 70 M19 70 L10 70',
        circle(28, 72, 9), circle(72, 72, 9), circle(28, 72, 3.5), circle(72, 72, 3.5),
        'M38 49 L44 38 L53 38 L53 49 Z', 'M57 49 L57 38 L66 38 L74 49 Z',
        'M83 56 L89 56 L89 61 L83 61 Z',
        'M4 81 L96 81',
      ],
    },
    {
      id: 'heart', name: '愛心',
      paths: [
        'M50 88 Q14 62 12 40 Q11 20 31 18 Q45 17 50 32 Q55 17 69 18 Q89 20 88 40 Q86 62 50 88 Z',
        'M50 72 Q32 58 31 46 Q31 36 40 35 Q47 35 50 43 Q53 35 60 35 Q69 36 69 46 Q68 58 50 72 Z',
      ],
    },
    { id: 'blank', name: '自由畫', paths: [] },
  ];
})();
