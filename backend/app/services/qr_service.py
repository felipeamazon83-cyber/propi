import io
import os
import qrcode
from PIL import Image, ImageDraw, ImageFont


def _find_assets_dir() -> str:
    """Busca la carpeta 'assets' tanto en backend/assets como subiendo hacia la raíz."""
    current_file = os.path.abspath(__file__)
    services_dir = os.path.dirname(current_file)
    app_dir = os.path.dirname(services_dir)
    backend_dir = os.path.dirname(app_dir)

    # 1. Probar en backend/assets
    candidate1 = os.path.join(backend_dir, "assets")
    if os.path.exists(candidate1) and os.path.isdir(candidate1):
        return candidate1

    # 2. Probar subiendo hacia la raíz del repositorio
    curr = services_dir
    while curr != os.path.dirname(curr):
        candidate = os.path.join(curr, "assets")
        if os.path.exists(candidate) and os.path.isdir(candidate):
            return candidate
        curr = os.path.dirname(curr)

    return candidate1


ASSETS_DIR = _find_assets_dir()


def png(url: str) -> bytes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def _draw_heart(draw: ImageDraw.ImageDraw, x: int, y: int, size: int, color: str):
    """Dibuja un corazón vectorial naranja alineado correctamente."""
    scale = size / 100.0
    points = [
        (50, 85),
        (20, 55),
        (10, 35),
        (15, 15),
        (35, 10),
        (50, 25),
        (65, 10),
        (85, 15),
        (90, 35),
        (80, 55),
    ]
    scaled_points = [(x + (px - 50) * scale, y + (py - 45) * scale) for px, py in points]
    draw.polygon(scaled_points, fill=color)


def generate_table_card_png(
    url: str, location_name: str, business_name: str
) -> bytes:
    # 1. Tarjeta A6 a 300 DPI con fondo Azul Marino Propi (#0F172A)
    width, height = 1240, 1748
    card = Image.new("RGBA", (width, height), "#0F172A")
    draw = ImageDraw.Draw(card)

    # 2. Carga de tipografías con respaldo
    font_bold_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Bold.ttf")
    font_medium_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Medium.ttf")

    try:
        font_title = ImageFont.truetype(font_bold_path, 60)
        font_sub = ImageFont.truetype(font_medium_path, 40)
        font_cta = ImageFont.truetype(font_bold_path, 46)
    except IOError:
        try:
            font_title = ImageFont.load_default(size=60)
            font_sub = ImageFont.load_default(size=40)
            font_cta = ImageFont.load_default(size=46)
        except TypeError:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            font_cta = ImageFont.load_default()

    # 3. Logo superior de Propi desde backend/assets
    logo_path = os.path.join(ASSETS_DIR, "propi-logo.png")
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path).convert("RGBA")
            logo_w = 340
            aspect_ratio = logo.height / logo.width
            logo = logo.resize(
                (logo_w, int(logo_w * aspect_ratio)), Image.Resampling.LANCZOS
            )
            card.paste(logo, ((width - logo_w) // 2, 80), mask=logo)
        except Exception:
            draw.text(
                (width // 2, 120),
                "propi",
                fill="#F97316",
                font=font_title,
                anchor="mm",
            )
    else:
        draw.text(
            (width // 2, 120),
            "propi",
            fill="#F97316",
            font=font_title,
            anchor="mm",
        )

    # 4. Nombre de Negocio y Mesa
    draw.text(
        (width // 2, 310), business_name, fill="white", font=font_title, anchor="mm"
    )
    draw.text(
        (width // 2, 385),
        location_name,
        fill="#94A3B8",
        font=font_sub,
        anchor="mm",
    )

    # 5. Código QR Naranja sobre fondo Blanco
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=15,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="#F97316", back_color="white").convert(
        "RGBA"
    )

    # Marco blanco alrededor del QR
    frame_padding = 36
    frame_w = qr_img.width + (frame_padding * 2)
    frame_h = qr_img.height + (frame_padding * 2)
    frame = Image.new("RGBA", (frame_w, frame_h), "white")
    frame.paste(qr_img, (frame_padding, frame_padding))

    qr_x = (width - frame_w) // 2
    card.paste(frame, (qr_x, 460))

    # 6. Texto de llamada a la acción con Corazón Naranja a la derecha
    cta_text = "DEJA AQUI TU PROPINA"

    # Obtener el ancho del texto para centrar todo el conjunto (texto + corazón)
    try:
        bbox = draw.textbbox((0, 0), cta_text, font=font_cta)
        text_w = bbox[2] - bbox[0]
    except AttributeError:
        text_w = len(cta_text) * 26

    heart_size = 40
    spacing = 18
    total_w = text_w + spacing + heart_size

    start_x = (width - total_w) // 2
    text_x = start_x + (text_w // 2)
    cta_y = 1430

    # Dibujar texto centrado
    draw.text(
        (text_x, cta_y),
        cta_text,
        fill="#F97316",
        font=font_cta,
        anchor="mm",
    )

    # Dibujar corazón a la derecha del texto
    heart_x = start_x + text_w + spacing + (heart_size // 2)
    _draw_heart(draw, heart_x, cta_y, heart_size, "#F97316")

    # 7. Retornar PNG a 300 DPI
    buffer = io.BytesIO()
    card.save(buffer, format="PNG", dpi=(300, 300))
    return buffer.getvalue()
