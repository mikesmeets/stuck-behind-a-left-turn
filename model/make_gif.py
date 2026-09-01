"""Render the replay to an animated GIF and an MP4.

The explainer is a canvas animation, so it needs JavaScript.  iOS Mail (and
most email clients) preview an attached .html file with scripting disabled, so
the page arrives with its text and tables intact and the two roads blank.  A
GIF has no such problem: it plays in Mail, in Gmail, in a slide deck and in a
document.

This drives the real page rather than reimplementing the drawing: it loads the
published explainer, steps `view.t` frame by frame with the animation paused,
and screenshots the roads panel each step.
"""
import io
import subprocess
import sys
from PIL import Image
from playwright.sync_api import sync_playwright

PAGE = "file:///home/claude/road_diet_weaving_public_standalone.html"
OUT = "/home/claude/road_diet_replay"

VOL = 700            # which volume to show
PICK = 0             # 0 = sample a
SIM_SECONDS = 90.0   # one full signal cycle
FRAMES = 120         # GIF frames
FPS = 12             # -> 10 s of GIF, about 7.5x real time
WIDTH = 900          # browser width; the roads panel is a little narrower


def main():
    step = SIM_SECONDS / FRAMES
    shots = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": WIDTH, "height": 900},
                        device_scale_factor=2)
        pg.goto(PAGE)
        pg.wait_for_timeout(2500)
        pg.evaluate(f"""() => {{
            view.playing = false;
            view.vol = {VOL};
            view.pick = {PICK};
            paintSeedCounts();
            document.querySelectorAll('#vol button').forEach(b =>
              b.setAttribute('aria-pressed', String(+b.dataset.v === {VOL})));
        }}""")

        for i in range(FRAMES):
            t = i * step
            pg.evaluate(f"""() => {{
                view.t = {t};
                lastFrameIndex = {{"4lane":-1,"3lane":-1}};
                resetTally();
                for (const cfg of ["4lane","3lane"]){{
                    const fi = Math.min(frames(cfg).length-1,
                                        Math.floor(view.t/TRACE.dt));
                    while (lastFrameIndex[cfg] < fi){{
                        lastFrameIndex[cfg]++; accrue(cfg, lastFrameIndex[cfg]);
                    }}
                    render(cfg, view.t);
                }}
                paintTally();
                const m = Math.floor(view.t/60), s = Math.floor(view.t%60);
                document.getElementById("clock").textContent =
                  `${{m}}:${{String(s).padStart(2,"0")}} / 3:00`;
            }}""")
            shots.append(Image.open(io.BytesIO(
                pg.locator(".roads").screenshot())).convert("RGB"))
            if i % 20 == 0:
                print("frame", i, flush=True)
        b.close()

    # ---- MP4 first: full resolution, small file, plays inline everywhere
    w, h = shots[0].size
    w -= w % 2
    h -= h % 2
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{shots[0].size[0]}x{shots[0].size[1]}", "-r", str(FPS),
         "-i", "-", "-vf", f"crop={w}:{h}:0:0", "-c:v", "libx264",
         "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart",
         f"{OUT}.mp4"],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL)
    for im in shots:
        proc.stdin.write(im.tobytes())
    proc.stdin.close()
    proc.wait()

    # ---- GIF: half scale so it stays emailable
    gw = 900
    small = [im.resize((gw, round(im.size[1] * gw / im.size[0])),
                       Image.LANCZOS).convert(
             "P", palette=Image.ADAPTIVE, colors=128) for im in shots]
    small[0].save(f"{OUT}.gif", save_all=True, append_images=small[1:],
                  duration=round(1000 / FPS), loop=0, optimize=True)

    import os
    for f in (f"{OUT}.gif", f"{OUT}.mp4"):
        print(f, round(os.path.getsize(f) / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
