"""
ホーム画面に置くアイコンを焼く。

鳩の形は src/pigeonArt.tsx の PigeonFlyer（翼を上げた姿）と同じ道筋を
そのまま写している。絵を変えるときは両方を直すこと。

    python tools/make_icons.py            # assets/ と public/ に書き出す
    python tools/make_icons.py --preview  # 見比べ用の一枚だけ作る

Pillow しか使わない。SVG を焼く道具は要らない。
"""

import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------- 色

SKY_TOP = (127, 163, 188)      # theme.sky そのもの
SKY_BOTTOM = (78, 112, 142)

# 白鳩の羽色（src/pigeonArt.tsx の PLUMAGES: white を少し明るくしたもの）
BACK = (242, 239, 232)
BREAST = (248, 246, 240)
WING = (228, 223, 213)
DARK = (195, 185, 168)
HEAD = (240, 237, 230)

BEAK = (78, 74, 70)
CERE = (239, 233, 224)
EYE = (216, 134, 47)
PUPIL = (28, 23, 18)

PAPER = (251, 247, 236)
PAPER_LINE = (200, 186, 160)
SEAL = (180, 85, 45)

WHITE = (255, 255, 255)

SS = 3  # 3倍で描いてから縮める。これで縁がなめらかになる


# ---------------------------------------------------------------- 下描きの道具


class Pen:
    """art 座標（鳩の絵は 48×30 の枠）を、実際の画素に置き換えて描く"""

    def __init__(self, img, scale, dx, dy):
        self.img = img
        self.scale = scale
        self.dx = dx
        self.dy = dy

    def at(self, x, y):
        return (x * self.scale + self.dx, y * self.scale + self.dy)

    def _layer(self):
        return Image.new('RGBA', self.img.size, (0, 0, 0, 0))

    def _blend(self, layer):
        self.img.alpha_composite(layer)

    def polygon(self, points, fill, opacity=1.0):
        layer = self._layer()
        ImageDraw.Draw(layer).polygon(
            [self.at(*p) for p in points], fill=fill + (int(255 * opacity),)
        )
        self._blend(layer)

    def ellipse(self, cx, cy, rx, ry, fill, opacity=1.0):
        layer = self._layer()
        x0, y0 = self.at(cx - rx, cy - ry)
        x1, y1 = self.at(cx + rx, cy + ry)
        ImageDraw.Draw(layer).ellipse(
            [x0, y0, x1, y1], fill=fill + (int(255 * opacity),)
        )
        self._blend(layer)

    def circle(self, cx, cy, r, fill, opacity=1.0):
        self.ellipse(cx, cy, r, r, fill, opacity)

    def ring(self, cx, cy, r, color, width, opacity=1.0):
        layer = self._layer()
        x0, y0 = self.at(cx - r, cy - r)
        x1, y1 = self.at(cx + r, cy + r)
        ImageDraw.Draw(layer).ellipse(
            [x0, y0, x1, y1],
            outline=color + (int(255 * opacity),),
            width=max(1, int(width * self.scale)),
        )
        self._blend(layer)

    def line(self, points, color, width, opacity=1.0):
        layer = self._layer()
        ImageDraw.Draw(layer).line(
            [self.at(*p) for p in points],
            fill=color + (int(255 * opacity),),
            width=max(1, int(width * self.scale)),
            joint='curve',
        )
        self._blend(layer)

    def rounded(self, x0, y0, x1, y1, r, fill, outline=None, width=1.0):
        layer = self._layer()
        a = self.at(x0, y0)
        b = self.at(x1, y1)
        ImageDraw.Draw(layer).rounded_rectangle(
            [a, b],
            radius=r * self.scale,
            fill=fill + (255,) if fill else None,
            outline=outline + (255,) if outline else None,
            width=max(1, int(width * self.scale)),
        )
        self._blend(layer)


def quad(p0, p1, p2, steps=24):
    """二次ベジエを折れ線にする。SVG の Q と同じ"""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append(
            (
                u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
            )
        )
    return out


# ---------------------------------------------------------------- 絵


def draw_sky(img):
    """空。上から下へ暮れていく"""
    w, h = img.size
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        draw.line(
            [(0, y), (w, y)],
            fill=tuple(
                int(SKY_TOP[i] + (SKY_BOTTOM[i] - SKY_TOP[i]) * t) for i in range(3)
            )
            + (255,),
        )
    # 鳩の後ろの、うっすら明るいところ。縁が出ないようにぼかす
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [w * 0.06, -h * 0.10, w * 0.94, h * 0.62], fill=WHITE + (46,)
    )
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(w * 0.06)))


def draw_pigeon(pen, mono=False):
    """翼を上げて飛んでいる鳩。src/pigeonArt.tsx の PigeonFlyer と同じ形"""
    if mono:
        back = breast = wing = head = dark = beak = WHITE
    else:
        back, breast, wing, head, dark, beak = BACK, BREAST, WING, HEAD, DARK, BEAK

    # 尾
    pen.polygon([(12, 15), (1, 12.6), (1.4, 19), (12.6, 18.6)], wing)
    if not mono:
        pen.polygon([(1.2, 16.4), (12.4, 16.4), (12.6, 18.2), (1.4, 19)], dark, 0.9)

    # 胴と胸
    pen.ellipse(24, 16, 11.6, 5.6, back)
    pen.ellipse(31, 16.6, 5.2, 4.6, breast)

    # 頭とくちばし
    pen.circle(37, 13.4, 4.6, head)
    pen.polygon([(41.4, 13), (46, 14), (41.4, 15.4)], beak)
    if not mono:
        pen.ellipse(40.4, 11.9, 1.5, 1.0, CERE)
        pen.circle(38.4, 12.2, 1.7, EYE)
        pen.circle(38.4, 12.2, 0.8, PUPIL)

    # 翼。奥の一枚を暗く、手前を明るく
    far = quad((22, 12.4), (17, 1.4), (6, 0.6)) + quad((6, 0.6), (13, 7), (18, 13.4))
    near = quad((26, 12), (22, 0.8), (11, 0)) + quad((11, 0), (18, 6.4), (22, 13))
    if mono:
        pen.polygon(far, WHITE)
        pen.polygon(near, WHITE)
    else:
        pen.polygon(far, dark, 0.7)
        pen.polygon(near, wing)


def draw_letter(img, cx, cy, width, angle=-7, mono=False):
    """鳩が運んでいる手紙。封蝋つき。別紙に描いてから傾けて貼る"""
    unit = width / 66.0
    pad = int(width * 0.6)
    w = int(width + pad * 2)
    sheet = Image.new('RGBA', (w, w), (0, 0, 0, 0))
    pen = Pen(sheet, unit, w / 2, w / 2)

    paper = WHITE if mono else PAPER
    pen.rounded(-33, -21, 33, 21, 3.5, paper, None if mono else PAPER_LINE, 1.6)
    if not mono:
        # 封を閉じた折り目
        pen.line([(-33, -19), (0, 5), (33, -19)], PAPER_LINE, 1.6)
        pen.line([(-33, 21), (-10, 0)], PAPER_LINE, 1.4, 0.6)
        pen.line([(33, 21), (10, 0)], PAPER_LINE, 1.4, 0.6)
        # 封蝋
        pen.circle(0, 5, 7.5, SEAL)
        pen.ring(0, 5, 4.0, PAPER, 1.3, 0.55)

    sheet = sheet.rotate(angle, resample=Image.BICUBIC, center=(w / 2, w / 2))
    img.alpha_composite(sheet, (int(cx - w / 2), int(cy - w / 2)))


def paste_center(img, sheet, cx, cy):
    img.alpha_composite(
        sheet, (int(cx - sheet.size[0] / 2), int(cy - sheet.size[1] / 2))
    )


def bird_sheet(scale, mono, angle):
    """鳩だけを別紙に描いて、切り詰めてから傾ける"""
    w = int(54 * scale)
    h = int(36 * scale)
    sheet = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw_pigeon(Pen(sheet, scale, 3 * scale, 4 * scale), mono=mono)
    sheet = sheet.crop(sheet.getbbox())
    return sheet.rotate(angle, resample=Image.BICUBIC, expand=True)


def render(size, art=0.74, bg=True, mono=False, letter=True, bg_only=False):
    """アイコン一枚。size は仕上がりの一辺"""
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    if bg:
        draw_sky(img)
    if bg_only:
        return img.resize((size, size), Image.LANCZOS)

    # 鳩の絵は 48×30 の枠。尾の先から嘴の先までが 45 ぶん
    scale = (big * art) / 45.0
    if letter:
        # 手紙は胸の下に重ねる。二つでひとつの絵に見えるように
        draw_letter(img, big * 0.600, big * 0.735, width=big * art * 0.44, mono=mono)
        paste_center(img, bird_sheet(scale, mono, -9), big * 0.47, big * 0.405)
    else:
        paste_center(img, bird_sheet(scale, mono, -9), big * 0.50, big * 0.50)
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------- 書き出し

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def save(img, *parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print(f'{os.path.join(*parts)}  {img.size[0]}px  {os.path.getsize(path):,} bytes')


def main():
    if '--preview' in sys.argv:
        sheet = Image.new('RGBA', (1080, 560), (245, 238, 223, 255))
        shots = [
            ('letter', render(256)),
            ('no letter', render(256, art=0.80, letter=False)),
            ('maskable', render(256, art=0.56)),
            ('small 60px', render(60).resize((256, 256), Image.NEAREST)),
        ]
        for i, (_, im) in enumerate(shots):
            sheet.alpha_composite(im, (20 + i * 265, 20))
        # 丸く切られたときの見え方
        for i, (_, im) in enumerate(shots):
            masked = im.copy()
            mask = Image.new('L', im.size, 0)
            ImageDraw.Draw(mask).ellipse([0, 0, im.size[0], im.size[1]], fill=255)
            masked.putalpha(mask)
            sheet.alpha_composite(masked, (20 + i * 265, 290))
        out = os.path.join(HERE, 'icon-preview.png')
        sheet.convert('RGB').save(out)
        print(out)
        return

    # ネイティブ（Expo の app.json が見ている）
    save(render(1024), 'assets', 'icon.png')
    save(render(1024, art=0.52, bg=False), 'assets', 'android-icon-foreground.png')
    save(render(1024, bg_only=True), 'assets', 'android-icon-background.png')
    save(
        render(1024, art=0.52, bg=False, mono=True),
        'assets',
        'android-icon-monochrome.png',
    )
    save(render(96), 'assets', 'favicon.png')
    save(render(512, art=0.62, bg=False), 'assets', 'splash-icon.png')

    # web（ホーム画面に追加したときに使われる）
    save(render(180), 'public', 'apple-touch-icon.png')
    save(render(192), 'public', 'icon-192.png')
    save(render(512), 'public', 'icon-512.png')
    save(render(512, art=0.56), 'public', 'icon-512-maskable.png')

    ico = os.path.join(ROOT, 'public', 'favicon.ico')
    render(256).save(ico, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)])
    print(f'public/favicon.ico  {os.path.getsize(ico):,} bytes')


if __name__ == '__main__':
    main()
