#!/usr/bin/env python3
"""H250 v11 fabrication drawing: R35 GT-R GT-wing stay, truss removed, wing holes moved."""

from __future__ import annotations

import math
from pathlib import Path

import ezdxf
import numpy as np
from ezdxf.enums import TextEntityAlignment

OUT = Path(__file__).resolve().parent
FONT = "WenQuanYi Micro Hei"

# --- v10 geometry (origin: lower-left of the 300x250 blank, X to the front, Y up) ---
V1 = np.array([60.0, 0.0])
V2 = np.array([300.0, 0.0])
V3 = np.array([300.0, 32.0])
V4 = np.array([158.0, 199.5])
V5 = np.array([0.0, 250.0])
U1 = np.array([30.83, 211.95])
U2 = np.array([138.16, 179.95])
L1 = np.array([105.5, 10.5])
L2 = np.array([180.0, 10.5])
L3 = np.array([254.5, 10.5])

# Hand measures on the wooden template, closed so 34/40 and 9/23
# reproduce the marked 82 mm horizontal and 89 mm diagonal.
DY1 = -math.sqrt(40.0**2 - 34.0**2)  # -21.071...
U1N = U1 + np.array([34.0, DY1])
U2N = U2 + np.array([9.0, -23.0])
SPAN = U2N - U1N
PITCH = float(np.linalg.norm(SPAN))
PITCH_ANG = math.degrees(math.atan2(-SPAN[1], SPAN[0]))

CHORD = V4 - V5
MID = (V5 + V4) / 2.0
HALF_CHORD = float(np.linalg.norm(CHORD) / 2)
R_ARC = 386.6
CENTER_DIST = math.sqrt(R_ARC**2 - HALF_CHORD**2)
PERP = np.array([-CHORD[1], CHORD[0]])
PERP = PERP / np.linalg.norm(PERP)
ARC_C = MID + PERP * CENTER_DIST
SAG = ARC_C - PERP * R_ARC  # (76.26, 216.18) — drawing lists 76.3, 216.2


def nrm(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v)


def left_normal(direction: np.ndarray) -> np.ndarray:
    d = nrm(direction)
    return np.array([-d[1], d[0]])


def line_line_fillet(a, b, c, radius: float):
    """Fillet at b. Boundary is CCW, material on the left."""
    d1 = nrm(b - a)
    d2 = nrm(c - b)
    n1 = left_normal(d1)
    n2 = left_normal(d2)
    p1 = b + n1 * radius
    p2 = b + n2 * radius
    mat = np.array([d1, -d2]).T
    t, _s = np.linalg.solve(mat, p2 - p1)
    center = p1 + d1 * t
    return center, center - n1 * radius, center - n2 * radius


def line_circle_candidates(line_a, line_b, circle_c, circle_r, fillet_r):
    """Centers inset to the left of line_a→line_b, tangent to the circle."""
    direction = nrm(line_b - line_a)
    normal = left_normal(direction)
    origin = line_b + normal * fillet_r
    found = []
    for dist in (circle_r + fillet_r, abs(circle_r - fillet_r)):
        w = origin - circle_c
        bb = 2 * float(np.dot(w, direction))
        cc = float(np.dot(w, w) - dist * dist)
        disc = bb * bb - 4 * cc
        if disc < 0:
            continue
        root = math.sqrt(disc)
        for sign in (-1.0, 1.0):
            t = (-bb + sign * root) / 2
            center = origin + direction * t
            on_line = center - normal * fillet_r
            toward = center - circle_c
            mag = np.linalg.norm(toward)
            on_arc = circle_c + toward / mag * circle_r
            found.append((center, on_line, on_arc, dist))
    return found


def inside_sharp(p, margin=0.0) -> bool:
    """Point-in-polygon for the unfilleted outline, CCW."""
    poly = [V1, V2, V3, V4, SAG, V5]
    # Use the arc as a stand-in via the sag so the concave top is respected.
    # A proper test: inside the line polygon V1-V2-V3-V4-V5 AND outside the big circle
    # is wrong because the arc sags below chord V5-V4. Material is the polygon
    # V1-V2-V3-V4-along arc-V5, i.e. below the arc.
    ring = [V1, V2, V3, V4, V5]
    x, y = float(p[0]), float(p[1])
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi):
            inside = not inside
        j = i
    if not inside:
        return False
    # Reject points above the concave arc (farther toward the circle center than the arc).
    if np.linalg.norm(p - ARC_C) < R_ARC - margin:
        return False
    return True


def pick_line_arc_fillet(line_a, line_b, corner, fillet_r):
    best = None
    for center, on_line, on_arc, dist in line_circle_candidates(line_a, line_b, ARC_C, R_ARC, fillet_r):
        if not inside_sharp(center, margin=-2):
            continue
        # Tangent points must sit near the corner and on the real edges.
        if np.linalg.norm(on_line - corner) > 45 or np.linalg.norm(on_arc - corner) > 45:
            continue
        score = float(np.linalg.norm(on_line - corner) + np.linalg.norm(on_arc - corner))
        # Prefer the external blend (center farther from the arc center than R).
        if np.linalg.norm(center - ARC_C) < R_ARC:
            score += 30
        if best is None or score < best[0]:
            best = (score, center, on_line, on_arc, dist)
    if best is None:
        raise RuntimeError(f"no fillet at {corner}")
    return best[1], best[2], best[3]


def signed_sweep(center, start, end, via=None, ccw=None) -> float:
    a1 = math.atan2(start[1] - center[1], start[0] - center[0])
    a2 = math.atan2(end[1] - center[1], end[0] - center[0])
    ccw_sweep = (a2 - a1) % (2 * math.pi)
    if ccw_sweep == 0:
        ccw_sweep = 2 * math.pi
    cw_sweep = ccw_sweep - 2 * math.pi
    if ccw is True:
        return ccw_sweep
    if ccw is False:
        return cw_sweep

    def mid_point(sweep):
        ang = a1 + sweep / 2
        r = np.linalg.norm(start - center)
        return center + r * np.array([math.cos(ang), math.sin(ang)])

    if via is None:
        return ccw_sweep if abs(ccw_sweep) < abs(cw_sweep) else cw_sweep
    d_ccw = np.linalg.norm(mid_point(ccw_sweep) - via)
    d_cw = np.linalg.norm(mid_point(cw_sweep) - via)
    return ccw_sweep if d_ccw < d_cw else cw_sweep


def bulge_of(sweep: float) -> float:
    return math.tan(sweep / 4)


# Fillets
C_V2, T_V2_IN, T_V2_OUT = line_line_fillet(V1, V2, V3, 5.0)
C_V3, T_V3_IN, T_V3_OUT = line_line_fillet(V2, V3, V4, 12.0)
C_V1, T_V1_IN, T_V1_OUT = line_line_fillet(V5, V1, V2, 6.0)
C_V4, T_V4_LINE, T_V4_ARC = pick_line_arc_fillet(V3, V4, V4, 20.0)
C_V5, T_V5_LINE, T_V5_ARC = pick_line_arc_fillet(V5, V1, V5, 12.0)

# Boundary, CCW from the bottom edge after the V1 fillet.
# Each item is (point, bulge_to_next).
SW_V2 = signed_sweep(C_V2, T_V2_IN, T_V2_OUT, ccw=True)
SW_V3 = signed_sweep(C_V3, T_V3_IN, T_V3_OUT, ccw=True)
SW_V4 = signed_sweep(C_V4, T_V4_LINE, T_V4_ARC, ccw=True)
SW_TOP = signed_sweep(ARC_C, T_V4_ARC, T_V5_ARC, via=SAG)
SW_V5 = signed_sweep(C_V5, T_V5_ARC, T_V5_LINE, ccw=True)
SW_V1 = signed_sweep(C_V1, T_V1_IN, T_V1_OUT, ccw=True)

PATH = [
    (T_V1_OUT, 0.0),
    (T_V2_IN, bulge_of(SW_V2)),
    (T_V2_OUT, 0.0),
    (T_V3_IN, bulge_of(SW_V3)),
    (T_V3_OUT, 0.0),
    (T_V4_LINE, bulge_of(SW_V4)),
    (T_V4_ARC, bulge_of(SW_TOP)),
    (T_V5_ARC, bulge_of(SW_V5)),
    (T_V5_LINE, 0.0),
    (T_V1_IN, bulge_of(SW_V1)),
]


def tessellate(path, tol=0.04) -> np.ndarray:
    pts = []
    n = len(path)
    for i, (p1, bulge) in enumerate(path):
        p2 = path[(i + 1) % n][0]
        if abs(bulge) < 1e-9:
            pts.append(p1)
            continue
        sweep = 4 * math.atan(bulge)
        chord = p2 - p1
        chord_len = np.linalg.norm(chord)
        radius = chord_len * (bulge * bulge + 1) / (4 * abs(bulge))
        # center
        mid = (p1 + p2) / 2
        h = math.sqrt(max(radius**2 - (chord_len / 2) ** 2, 0))
        direction = nrm(np.array([-chord[1], chord[0]]))
        # bulge > 0 means CCW, center is to the left of p1→p2
        center = mid + direction * h * (1 if bulge > 0 else -1)
        a1 = math.atan2(p1[1] - center[1], p1[0] - center[0])
        steps = max(2, int(math.ceil(abs(sweep) / max(0.02, 2 * math.acos(max(-1, min(1, 1 - tol / radius)))))))
        for k in range(steps):
            t = a1 + sweep * k / steps
            pts.append(center + radius * np.array([math.cos(t), math.sin(t)]))
    return np.array(pts)


OUTLINE = tessellate(PATH)


def dist_to_outline(p) -> float:
    dmin = 1e9
    m = len(OUTLINE)
    for i in range(m):
        a = OUTLINE[i]
        b = OUTLINE[(i + 1) % m]
        ab = b - a
        lab = float(np.dot(ab, ab))
        t = 0.0 if lab == 0 else float(np.clip(np.dot(p - a, ab) / lab, 0, 1))
        dmin = min(dmin, float(np.linalg.norm(p - (a + t * ab))))
    return dmin


def fmt(v, nd=2) -> str:
    return f"{v:.{nd}f}"


# ---------- drawing ----------
PW, PH = 841.0, 594.0  # A1 landscape, millimetres
S = 1.32
OX, OY = 62.0, 548.0

INK = "#1c2430"
DIM = "#1a4f8b"
RED = "#b42318"
BLUE = "#1a5276"
OLD = "#8d96a3"
STOCK = "#9aa6b2"
FILL = "#e7f2e4"
PALE = "#f4f7fb"
WARN_BG = "#fff4e5"
WARN = "#8a4b08"
HAIR = "#d5dde6"
WHITE = "#ffffff"


def paper(x, y):
    return OX + S * float(x), OY - S * float(y)


class Svg:
    def __init__(self):
        self.parts: list[str] = []

    def add(self, s: str):
        self.parts.append(s)

    def line(self, x1, y1, x2, y2, stroke, w=0.25, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
            f'stroke="{stroke}" stroke-width="{w}" fill="none"{d}/>'
        )

    def mline(self, a, b, stroke, w=0.35, dash=None):
        x1, y1 = paper(*a)
        x2, y2 = paper(*b)
        self.line(x1, y1, x2, y2, stroke, w, dash)

    def poly(self, pts, stroke, w=0.45, fill="none", dash=None, close=False):
        seq = " ".join(f"{paper(p[0], p[1])[0]:.2f},{paper(p[0], p[1])[1]:.2f}" for p in pts)
        d = f' stroke-dasharray="{dash}"' if dash else ""
        cmd = "polygon" if close else "polyline"
        self.add(
            f'<{cmd} points="{seq}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" '
            f'stroke-linejoin="round" stroke-linecap="round"{d}/>'
        )

    def circle_m(self, c, r, stroke, w=0.4, fill="none", dash=None):
        x, y = paper(*c)
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r * S:.2f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{w}"{d}/>'
        )

    def text(self, x, y, s, size=3.1, fill=INK, anchor="start", weight="400", rotate=None):
        s = (
            s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        tr = f' transform="rotate({rotate:.1f} {x:.2f} {y:.2f})"' if rotate else ""
        self.add(
            f'<text x="{x:.2f}" y="{y:.2f}" fill="{fill}" font-size="{size:.2f}" '
            f'font-family="{FONT}, sans-serif" font-weight="{weight}" '
            f'text-anchor="{anchor}"{tr}>{s}</text>'
        )

    def mtext(self, mx, my, s, dx=0, dy=0, **kw):
        x, y = paper(mx, my)
        self.text(x + dx, y + dy, s, **kw)

    def rect(self, x, y, w, h, fill="none", stroke=INK, sw=0.3):
        self.add(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
        )

    def save(self, path: Path):
        body = "\n".join(self.parts)
        doc = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{PW}mm" height="{PH}mm" viewBox="0 0 {PW} {PH}">
<rect width="100%" height="100%" fill="#ffffff"/>
<style>text {{ font-family: "{FONT}", sans-serif; }}</style>
{body}
</svg>
'''
        path.write_text(doc, encoding="utf-8")


def dim_h(svg: Svg, x1, x2, y, label, tick=4.5):
    """Horizontal dimension in model space, text above the line."""
    a, b = paper(x1, y), paper(x2, y)
    svg.line(a[0], a[1], b[0], b[1], DIM, 0.22)
    for x in (x1, x2):
        p = paper(x, y)
        svg.line(p[0], p[1] - tick, p[0], p[1] + 1.2, DIM, 0.22)
    mid = ((a[0] + b[0]) / 2, a[1] - 1.3)
    svg.text(mid[0], mid[1], label, size=2.7, fill=DIM, anchor="middle")


def dim_v(svg: Svg, y1, y2, x, label, side="left"):
    a, b = paper(x, y1), paper(x, y2)
    svg.line(a[0], a[1], b[0], b[1], DIM, 0.22)
    for y in (y1, y2):
        p = paper(x, y)
        svg.line(p[0] - 1.2, p[1], p[0] + 4.2, p[1], DIM, 0.22)
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    dx = -2.2 if side == "left" else 2.2
    anchor = "end" if side == "left" else "start"
    svg.text(mid[0] + dx, mid[1], label, size=2.7, fill=DIM, anchor=anchor, rotate=-90)


def leader(svg: Svg, mx, my, px, py, text, color=INK, size=2.8):
    x0, y0 = paper(mx, my)
    svg.line(x0, y0, px, py, color, 0.22)
    anchor = "start" if px >= x0 else "end"
    svg.text(px + (1.2 if anchor == "start" else -1.2), py - 0.6, text, size=size, fill=color, anchor=anchor, weight="600")


def draw():
    svg = Svg()
    # frame
    svg.rect(6, 6, PW - 12, PH - 12, fill="none", stroke=INK, sw=0.7)
    svg.rect(8, 8, PW - 16, PH - 16, fill="none", stroke=INK, sw=0.25)

    # title strip
    svg.rect(8, 8, PW - 16, 34, fill=INK, stroke=INK, sw=0.3)
    svg.text(18, 22, "R35 GT-R  GTウィング かさ上げステー  製作図面", size=6.4, fill=WHITE, weight="700")
    svg.text(18, 36, "H250 v11    トラス無し    ウイング穴を赤点へ移設    SUS304  t5", size=3.3, fill="#d6deea")
    svg.text(PW - 18, 22, "尺度 1 : 1 を 1.32倍で配置", size=2.8, fill="#d6deea", anchor="end")
    svg.text(PW - 18, 36, "原点は 300×250 板の左下    X→車両前方    Y↑", size=2.8, fill="#d6deea", anchor="end")

    # stock rectangle
    stock = [(0, 0), (300, 0), (300, 250), (0, 250)]
    svg.poly(stock, STOCK, 0.28, fill="none", dash="2.2 1.6", close=True)
    svg.mtext(150, 256, "材料枠 300 × 250（破線）", anchor="middle", size=2.5, fill=STOCK)

    # part fill + outline
    svg.poly(OUTLINE, INK, 0.7, fill=FILL, close=True)

    # axes ticks
    for x in range(50, 301, 50):
        p = paper(x, 0)
        svg.line(p[0], p[1], p[0], p[1] + 2.4, INK, 0.25)
        svg.text(p[0], p[1] + 6.2, str(x), size=2.3, fill=INK, anchor="middle")
    for y in range(0, 251, 50):
        p = paper(0, y)
        svg.line(p[0] - 2.4, p[1], p[0], p[1], INK, 0.25)
        svg.text(p[0] - 3.4, p[1] + 0.8, str(y), size=2.3, fill=INK, anchor="end")
    svg.mtext(150, -26, "X [mm]   左 0（材料左端） → 右 300（車両前方）", anchor="middle", size=2.5, fill=INK)
    svg.mtext(-8, 262, "Y", size=2.6, fill=INK, anchor="end", weight="700")

    # direction
    svg.mtext(20, 262, "◀  車両後方  REAR", size=2.8, fill=DIM, weight="700")
    svg.mtext(210, 262, "車両前方  FRONT  ▶", size=2.8, fill=DIM, weight="700")

    # overall dims
    dim_h(svg, 0, 60, -12, "60")
    dim_h(svg, 60, 300, -12, "底辺 240（板の下辺を使用）")
    dim_v(svg, 0, 250, -22, "250", side="left")
    dim_v(svg, 0, 32, 312, "32", side="right")

    # edge length labels
    svg.mtext(28, 130, "後縁 257.1", size=2.6, fill=DIM, rotate=-76, anchor="middle")
    svg.mtext(232, 112, "前斜辺 219.6", size=2.6, fill=DIM, rotate=50, anchor="middle")
    svg.mtext(78, 232, "上辺 凹アール  R386.6    弦 165.9    矢高 9.0", size=2.6, fill=DIM, anchor="middle")
    svg.mtext(SAG[0], SAG[1], "最深", dx=0, dy=-7, size=2.2, fill=DIM, anchor="middle")
    sx, sy = paper(*SAG)
    svg.line(sx, sy - 1.5, sx, sy + 1.5, DIM, 0.3)
    svg.line(sx - 1.5, sy, sx + 1.5, sy, DIM, 0.3)

    # corner tags
    svg.mtext(*V5, "V5  R12", dx=8, dy=-10, size=2.5, fill=INK, anchor="start")
    svg.mtext(*V4, "V4  R20", dx=8, dy=-12, size=2.5, fill=INK, anchor="start")
    svg.mtext(278, 46, "V3  R12", size=2.5, fill=INK, anchor="end")
    svg.mtext(278, 8, "V2  R5", size=2.5, fill=INK, anchor="end")
    svg.mtext(78, 14, "V1  R6", size=2.5, fill=INK, anchor="start")

    svg.mtext(168, 90, "トラス抜きなし（中実）", anchor="middle", size=3.4, fill="#3d6b45", weight="700")
    svg.mtext(168, 80, "v10 の W1・W2 は廃止", anchor="middle", size=2.5, fill="#3d6b45")

    # old wing holes (reference, do not drill)
    for c, name in ((U1, "現行U1"), (U2, "現行U2")):
        svg.circle_m(c, 3.25, OLD, 0.28, fill="none", dash="1.3 0.9")
        x, y = paper(*c)
        svg.line(x - 5, y, x + 5, y, OLD, 0.18)
        svg.line(x, y - 5, x, y + 5, OLD, 0.18)

    # move arrows, kept gray so they are not read as the new pitch
    for a, b in ((U1, U1N), (U2, U2N)):
        x1, y1 = paper(*a)
        x2, y2 = paper(*b)
        svg.line(x1, y1, x2, y2, OLD, 0.25, dash="1.4 1.0")

    # new wing holes
    for c in (U1N, U2N):
        svg.circle_m(c, 3.25, RED, 0.55, fill="#fde8e6")
        x, y = paper(*c)
        svg.line(x - 7, y, x + 7, y, RED, 0.22)
        svg.line(x, y - 7, x, y + 7, RED, 0.22)

    # pitch line
    svg.mline(U1N, U2N, RED, 0.28, dash="3 1.4")
    midp = (U1N + U2N) / 2
    svg.mtext(midp[0], midp[1], f"斜め {PITCH:.2f}", dx=8, dy=-6, size=2.8, fill=RED, weight="700", anchor="start")

    # horizontal / vertical pitch dims in model space, kept off the outline
    dim_h(svg, U1N[0], U2N[0], 128, f"横 {SPAN[0]:.2f}")
    # vertical dim just right of U2'
    dim_v(svg, U2N[1], U1N[1], 168, f"縦 {abs(SPAN[1]):.2f}", side="right")

    svg.mtext(30, 178, "U1'  φ6.5", size=2.7, fill=RED, anchor="start", weight="700")
    svg.mtext(30, 172, f"({U1N[0]:.2f}, {U1N[1]:.2f})", size=2.5, fill=RED, anchor="start")
    svg.mtext(118, 146, "U2'  φ6.5", size=2.7, fill=RED, anchor="start", weight="700")
    svg.mtext(118, 140, f"({U2N[0]:.2f}, {U2N[1]:.2f})", size=2.5, fill=RED, anchor="start")
    svg.mtext(U1[0], U1[1], "現行", dx=-10, dy=-7, size=2.2, fill=OLD, anchor="end")
    svg.mtext(U2[0], U2[1], "現行", dx=-8, dy=-8, size=2.2, fill=OLD, anchor="end")

    # mount holes
    for c, name, dx in ((L1, "L1", -8), (L2, "L2", 0), (L3, "L3", 8)):
        svg.circle_m(c, 6.0, BLUE, 0.25, dash="1.1 0.8")  # countersink
        svg.circle_m(c, 3.25, BLUE, 0.5, fill="#e4eef8")
        x, y = paper(*c)
        svg.line(x - 5.5, y, x + 5.5, y, BLUE, 0.18)
        svg.line(x, y - 5.5, x, y + 5.5, BLUE, 0.18)
        svg.mtext(c[0], c[1], name, dx=dx, dy=14, size=2.6, fill=BLUE, anchor="middle", weight="700")
    svg.mtext(180, 28, "下マウント  皿φ12（上面） / キリ φ6.5    ピッチ 74.5", anchor="middle", size=2.6, fill=BLUE)

    dim_h(svg, 60, 105.5, -21, "45.5")
    dim_h(svg, 105.5, 180.0, -21, "74.5")
    dim_h(svg, 180.0, 254.5, -21, "74.5")
    dim_h(svg, 254.5, 300.0, -21, "45.5")

    # edge clearance of the new holes
    d1 = dist_to_outline(U1N)
    d2 = dist_to_outline(U2N)
    svg.mtext(46, 160, f"縁まで {d1:.1f}", size=2.3, fill=RED, anchor="start")
    svg.mtext(176, 136, f"縁まで {d2:.1f}", size=2.3, fill=RED, anchor="start")

    # ---------- right panel ----------
    rx, ry, rw = 508, 50, 318
    svg.rect(rx, ry, rw, 78, fill=WARN_BG, stroke=WARN, sw=0.4)
    svg.text(rx + 8, ry + 8, "切断前の確認", size=3.2, fill=WARN, weight="700")
    svg.text(rx + 8, ry + 18, "ウイング取付の穴ピッチが変わります。ブラケット実測と合わせてから切る。", size=2.6, fill=WARN)
    svg.text(rx + 8, ry + 30, f"現行   斜め 112.00    横 107.33    縦 32.00    角度 16.6°", size=2.7, fill=OLD)
    svg.text(rx + 8, ry + 42, f"v11    斜め {PITCH:.2f}    横 {SPAN[0]:.2f}    縦 {abs(SPAN[1]):.2f}    角度 {PITCH_ANG:.1f}°", size=2.9, fill=RED, weight="700")
    svg.text(rx + 8, ry + 56, "下マウント L1・L2・L3 は v10 のまま。トラス穴は開けない。", size=2.6, fill=WARN)
    svg.text(rx + 8, ry + 68, "反対側の1枚は本図の鏡像（前後が反転）。", size=2.6, fill=WARN)

    # coordinate table
    ty = ry + 88
    svg.text(rx, ty, "穴・外周の座標    原点 = 300×250 板の左下", size=3.3, fill=INK, weight="700")
    headers = ["部位", "X", "Y", "加工"]
    cols = [0, 78, 118, 158]
    top = ty + 6
    row_h = 7.15
    rows = [
        ["U1'  ウイング後", f"{U1N[0]:.2f}", f"{U1N[1]:.2f}", "φ6.5 キリ   新"],
        ["U2'  ウイング前", f"{U2N[0]:.2f}", f"{U2N[1]:.2f}", "φ6.5 キリ   新"],
        ["L1  下マウント後", "105.50", "10.50", "皿φ12 / φ6.5"],
        ["L2  下マウント中", "180.00", "10.50", "皿φ12 / φ6.5"],
        ["L3  下マウント前", "254.50", "10.50", "皿φ12 / φ6.5"],
        ["現行 U1（参考）", "30.83", "211.95", "加工しない"],
        ["現行 U2（参考）", "138.16", "179.95", "加工しない"],
        ["V5  後端上", "0.00", "250.00", "角 R12"],
        ["V4  上辺・斜辺", "158.00", "199.50", "角 R20"],
        ["V3  前端立上り", "300.00", "32.00", "角 R12"],
        ["V2  下辺前端", "300.00", "0.00", "角 R5"],
        ["V1  下辺後端", "60.00", "0.00", "角 R6"],
        ["上辺 最深", "76.26", "216.18", "R386.6  矢高9"],
    ]
    svg.rect(rx, top, rw, row_h, fill=INK, stroke="none")
    for i, h in enumerate(headers):
        svg.text(rx + cols[i] + 2, top + 5.0, h, size=2.5, fill=WHITE, weight="700")
    for r, row in enumerate(rows):
        y = top + (r + 1) * row_h
        bg = "#fdecea" if r < 2 else ("#f7f8fa" if r % 2 == 0 else WHITE)
        svg.rect(rx, y, rw, row_h, fill=bg, stroke=HAIR, sw=0.15)
        color = RED if r < 2 else (OLD if r in (5, 6) else INK)
        weight = "700" if r < 5 else "400"
        for i, cell in enumerate(row):
            svg.text(rx + cols[i] + 2, y + 5.0, cell, size=2.45, fill=color, weight=weight)

    # how the red points were read
    ny = top + (len(rows) + 1) * row_h + 8
    svg.text(rx, ny, "赤点の読み（試作木材の手計測）", size=3.3, fill=INK, weight="700")
    notes = [
        "U1' は現行U1から前方 34mm、直線 40mm。",
        f"  縦は √(40²−34²) = {abs(DY1):.2f} mm 下げ。",
        "U2' は現行U2から前方 9mm、下方 23mm。",
        "  直線は √(9²+23²) = 24.70 mm（メモは 24）。",
        f"2点間は 横 {SPAN[0]:.2f}（メモ 82）、縦 {abs(SPAN[1]):.2f}、",
        f"  斜め {PITCH:.2f}（メモ 89）。横と斜めで閉じる。",
        "縦メモ 32.5 は計算 33.93 と 1.4mm 差。",
        "  横82・斜め89が同時に合う側を採用。",
        "20.5 は現行U1から上辺までの実測。",
        "  図面の半径方向すきまは 20.0mm。新穴の位置には使わない。",
        f"新穴の外形までの最短  U1' {d1:.1f} mm / U2' {d2:.1f} mm。",
    ]
    for i, line in enumerate(notes):
        svg.text(rx, ny + 8 + i * 4.15, line, size=2.5, fill=INK)

    fy = ny + 8 + len(notes) * 4.15 + 6
    svg.text(rx, fy, "加工", size=3.3, fill=INK, weight="700")
    fab = [
        "材質 SUS304  t5。1枚の外形は 300×250 の枠内。",
        "本板 600×300 から左右2枚取り（v10 の板取りと同じ）。",
        "外形・角R・上辺アールは v10 のまま。",
        "v10 の三角トラス W1・W2 は設けない。",
        "ウイング穴は φ6.5 のキリのみ（皿なし）。",
        "下3穴は上面から皿 φ12、通りは φ6.5。",
        "破線の現行U1・U2は位置の参考。新板では開けない。",
        "座標は板の左下原点。反対側は X を前後反転した鏡像。",
    ]
    for i, line in enumerate(fab):
        svg.text(rx, fy + 8 + i * 4.15, line, size=2.5, fill=INK)

    svg.text(rx, 568, "H250 v11    v10 からの変更: トラス廃止。ウイング穴は U1'・U2'。下穴と外形は v10。", size=2.4, fill=INK)

    svg_path = OUT / "R35-GT-wing-stay-H250-v11.svg"
    svg.save(svg_path)
    write_dxf(OUT / "R35-GT-wing-stay-H250-v11.dxf")
    print(f"U1' {U1N[0]:.2f} {U1N[1]:.2f}")
    print(f"U2' {U2N[0]:.2f} {U2N[1]:.2f}")
    print(f"span {SPAN[0]:.2f} {SPAN[1]:.2f} pitch {PITCH:.2f} ang {PITCH_ANG:.2f}")
    print(f"edge U1' {d1:.2f} U2' {d2:.2f}")
    print(f"sag {SAG[0]:.2f} {SAG[1]:.2f}")
    print(f"fillet sweeps deg V2 {math.degrees(SW_V2):.1f} V3 {math.degrees(SW_V3):.1f} V4 {math.degrees(SW_V4):.1f} top {math.degrees(SW_TOP):.1f} V5 {math.degrees(SW_V5):.1f} V1 {math.degrees(SW_V1):.1f}")
    return svg_path


def write_dxf(path: Path):
    doc = ezdxf.new("R2018", setup=True)
    doc.units = ezdxf.units.MM
    for name, color in (
        ("OUTLINE", 7),
        ("HOLE_WING", 1),
        ("HOLE_MOUNT", 5),
        ("CSINK_MARK", 4),
        ("REF_OLD", 8),
        ("STOCK", 8),
        ("NOTE", 7),
    ):
        doc.layers.add(name, color=color)
    msp = doc.modelspace()
    # outline as bulge polyline, closed
    msp.add_lwpolyline(
        [(float(p[0]), float(p[1]), 0, 0, float(b)) for p, b in PATH],
        close=True,
        dxfattribs={"layer": "OUTLINE"},
    )
    for c in (U1N, U2N):
        msp.add_circle((float(c[0]), float(c[1])), 3.25, dxfattribs={"layer": "HOLE_WING"})
    for c in (L1, L2, L3):
        msp.add_circle((float(c[0]), float(c[1])), 3.25, dxfattribs={"layer": "HOLE_MOUNT"})
        msp.add_circle((float(c[0]), float(c[1])), 6.0, dxfattribs={"layer": "CSINK_MARK"})
    for c in (U1, U2):
        msp.add_circle((float(c[0]), float(c[1])), 3.25, dxfattribs={"layer": "REF_OLD"})
    msp.add_lwpolyline([(0, 0), (300, 0), (300, 250), (0, 250)], close=True, dxfattribs={"layer": "STOCK"})
    note = (
        "H250 v11 SUS304 t5. Drill HOLE_WING and HOLE_MOUNT (dia 6.5). "
        "CSINK_MARK is countersink dia 12 on L1-L3 only, not a through cut. "
        "Do not cut REF_OLD or STOCK. No truss. Mirror for the other side."
    )
    msp.add_text(note, height=3.5, dxfattribs={"layer": "NOTE", "insert": (0, -12)})
    doc.saveas(path)


if __name__ == "__main__":
    draw()
