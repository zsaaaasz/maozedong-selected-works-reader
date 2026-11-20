"""Generate Android launcher and splash resources from resources/branding."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android/app/src/main/res"
BRANDING = ROOT / "resources/branding"


def make_launcher_icons() -> None:
    icon = Image.open(BRANDING / "app-icon-source.webp").convert("RGB")

    for density, size in (
        ("mdpi", 48),
        ("hdpi", 72),
        ("xhdpi", 96),
        ("xxhdpi", 144),
        ("xxxhdpi", 192),
    ):
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        resized = icon.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(folder / "ic_launcher.png", optimize=True)

        round_icon = resized.convert("RGBA")
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        round_icon.putalpha(mask)
        round_icon.save(folder / "ic_launcher_round.png", optimize=True)

    for density, size in (
        ("mdpi", 108),
        ("hdpi", 162),
        ("xhdpi", 216),
        ("xxhdpi", 324),
        ("xxxhdpi", 432),
    ):
        icon.resize((size, size), Image.Resampling.LANCZOS).save(
            RES / f"mipmap-{density}" / "ic_launcher_foreground.png",
            optimize=True,
        )


def make_splash_art() -> None:
    splash = Image.open(BRANDING / "splash-source.webp").convert("RGB")

    # The image is large and textured. WebP keeps the APK small while preserving
    # the original as an editable source file in resources/branding.
    public_splash = ROOT / "public/assets/launch-screen.webp"
    public_splash.parent.mkdir(parents=True, exist_ok=True)
    splash.save(public_splash, "WEBP", quality=88, method=6)

    portrait_folder = RES / "drawable-nodpi"
    portrait_folder.mkdir(parents=True, exist_ok=True)
    splash.save(portrait_folder / "splash.webp", "WEBP", quality=88, method=6)

    landscape = Image.new("RGB", (1672, 941), (8, 5, 4))
    poster = splash.copy()
    poster.thumbnail(landscape.size, Image.Resampling.LANCZOS)
    landscape.paste(
        poster,
        ((landscape.width - poster.width) // 2, (landscape.height - poster.height) // 2),
    )
    landscape_folder = RES / "drawable-land-nodpi"
    landscape_folder.mkdir(parents=True, exist_ok=True)
    landscape.save(landscape_folder / "splash.webp", "WEBP", quality=88, method=6)

    # Replace the old generated per-density PNG splash set. Orientation-specific
    # nodpi WebP resources let Android scale one source to the current display.
    for old_splash in RES.rglob("splash.png"):
        folder = old_splash.parent.name
        if folder == "drawable" or folder.startswith(("drawable-port-", "drawable-land-")):
            old_splash.unlink()


if __name__ == "__main__":
    make_launcher_icons()
    make_splash_art()
    print("Generated Android launcher and splash artwork.")
