import io
import os
import qrcode
from PIL import Image, ImageDraw, ImageFont


def _find_assets_dir() -> str:
    """Busca dinámicamente la carpeta 'assets' desde la ubicación actual hacia la raíz."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    while current_dir != os.path.dirname(current_dir):
        candidate = os.path.join(current_dir, "assets")
        if os.path.exists(candidate) and os.path.isdir(candidate):
            return candidate
        current_dir = os.path.dirname(current_dir)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")


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


def generate_table_card_png(
    url: str, location_name: str, business_name: str
) -> bytes:
    # 1. Tarjeta A6 a 300 DPI con fondo Azul Marino Propi (#0F172A)
    width, height = 1240, 1748
    card = Image.new("RGBA", (width, height), "#0F172A")
    draw = ImageDraw.Draw(card)

    # 2. Tipografías proporcionales grandes
    font_bold_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Bold.ttf")
    font_medium_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Medium.ttf")

    try:
        font_title = ImageFont.truetype(font_bold_path, 64)
        font_sub = ImageFont.truetype(font_medium_path, 42)
        font_cta = ImageFont.truetype(font_bold_path, 48)
        font_small = ImageFont.truetype(font_medium_path, 34)
    except IOError:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_cta = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 3. Cargar Logo superior de Propi desde assets
    logo_path = os.path.join(ASSETS_DIR, "propi-logo.png")
    if os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path).convert("RGBA")
            logo_w = 360
            aspect_ratio = logo.height / logo.width
            logo = logo.resize(
                (logo_w, int(logo_w * aspect_ratio)), Image.Resampling.LANCZOS
            )
            card.paste(logo, ((width - logo_w) // 2, 90), mask=logo)
        except Exception:
            draw.text(
                (width // 2, 110),
                "propi",
                fill="#F97316",
                font=font_title,
                anchor="mm",
            )
    else:
        draw.text(
            (width // 2, 110),
            "propi",
            fill="#F97316",
            font=font_title,
            anchor="mm",
        )

    # 4. Nombre de Negocio y Mesa en blanco/gris
    draw.text(
        (width // 2, 270), business_name, fill="white", font=font_title, anchor="mm"
    )
    draw.text(
        (width // 2, 345),
        location_name,
        fill="#94A3B8",
        font=font_sub,
        anchor="mm",
    )

    # 5. Generar QR Naranja sobre fondo Blanco
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # QR Naranja (#F97316) con fondo Blanco
    qr_img = qr.make_image(fill_color="#F97316", back_color="white").convert(
        "RGBA"
    )

    # Cargar corazón central desde assets si existe
    heart_path = os.path.join(ASSETS_DIR, "propi-heart.png")
    if os.path.exists(heart_path):
        try:
            heart = Image.open(heart_path).convert("RGBA")
            heart_size = int(qr_img.width * 0.22)
            heart = heart.resize(
                (heart_size, heart_size), Image.Resampling.LANCZOS
            )

            # Fondo blanco para aislar el corazón dentro del QR
            pad = 12
            bg_heart = Image.new(
                "RGBA", (heart_size + pad, heart_size + pad), "white"
            )
            pos_bg = (
                (qr_img.width - (heart_size + pad)) // 2,
                (qr_img.height - (heart_size + pad)) // 2,
            )
            qr_img.paste(bg_heart, pos_bg)

            pos_heart = (
                (qr_img.width - heart_size) // 2,
                (qr_img.height - heart_size) // 2,
            )
            qr_img.paste(heart, pos_heart, mask=heart)
        except Exception:
            pass

    # Marco blanco alrededor del QR
    frame_padding = 36
    frame_w = qr_img.width + (frame_padding * 2)
    frame_h = qr_img.height + (frame_padding * 2)
    frame = Image.new("RGBA", (frame_w, frame_h), "white")
    frame.paste(qr_img, (frame_padding, frame_padding))

    qr_x = (width - frame_w) // 2
    card.paste(frame, (qr_x, 430))

    # 6. Texto inferior simplificado
    draw.text(
        (width // 2, 1380),
        "DEJA AQUI TU PROPINA",
        fill="#F97316",
        font=font_cta,
        anchor="mm",
    )

    draw.text(
        (width // 2, 1470),
        "Escanea con tu camara o acerca tu movil",
        fill="#94A3B8",
        font=font_small,
        anchor="mm",
    )

    # 7. Retornar PNG
    buffer = io.BytesIO()
    card.save(buffer, format="PNG", dpi=(300, 300))
    return buffer.getvalue()
