import os
import io
import qrcode
from PIL import Image, ImageDraw, ImageFont

# Definir la ruta base del proyecto para no fallar en Render/Linux
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")


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
    # Canvas A6 a 300 DPI (Fondo Blanco Limpio)
    width, height = 1240, 1748
    card = Image.new("RGBA", (width, height), "white")
    draw = ImageDraw.Draw(card)

    # Rutas absolutas a fuentes
    font_bold_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Bold.ttf")
    font_medium_path = os.path.join(ASSETS_DIR, "fonts", "Inter-Medium.ttf")

    # Intentar cargar tipografías en tamaños gigantes para 300 DPI
    try:
        font_title = ImageFont.truetype(font_bold_path, 65)
        font_sub = ImageFont.truetype(font_medium_path, 45)
        font_cta = ImageFont.truetype(font_bold_path, 42)
        font_small = ImageFont.truetype(font_medium_path, 36)
    except IOError:
        # Respaldo con tamaño proporcional en caso de no existir .ttf
        font_title = ImageFont.load_default(size=65)
        font_sub = ImageFont.load_default(size=45)
        font_cta = ImageFont.load_default(size=42)
        font_small = ImageFont.load_default(size=36)

    # 1. Logo superior Propi
    logo_path = os.path.join(ASSETS_DIR, "propi-logo.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo_w = 380
        aspect_ratio = logo.height / logo.width
        logo = logo.resize(
            (logo_w, int(logo_w * aspect_ratio)), Image.Resampling.LANCZOS
        )
        card.paste(logo, ((width - logo_w) // 2, 90), mask=logo)
    else:
        draw.text(
            (width // 2, 110),
            "propi",
            fill="#F97316",
            font=font_title,
            anchor="mm",
        )

    # 2. Textos de Encabezado (Azul Marino y Gris)
    draw.text(
        (width // 2, 270), business_name, fill="#0F172A", font=font_title, anchor="mm"
    )
    draw.text(
        (width // 2, 350),
        location_name,
        fill="#64748B",
        font=font_sub,
        anchor="mm",
    )

    # 3. Código QR Ajustado (Azul Marino sobre Fondo Blanco)
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=15,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white").convert(
        "RGBA"
    )

    # Insertar corazón en el centro si existe la imagen
    heart_path = os.path.join(ASSETS_DIR, "propi-heart.png")
    if os.path.exists(heart_path):
        heart = Image.open(heart_path).convert("RGBA")
        heart_size = int(qr_img.width * 0.24)
        heart = heart.resize(
            (heart_size, heart_size), Image.Resampling.LANCZOS
        )
        
        # Fondo blanco redondo/cuadrado detrás del corazón para que no choque con los módulos del QR
        bg_heart = Image.new("RGBA", (heart_size + 10, heart_size + 10), "white")
        pos_bg = ((qr_img.width - (heart_size + 10)) // 2, (qr_img.height - (heart_size + 10)) // 2)
        qr_img.paste(bg_heart, pos_bg)

        pos_heart = ((qr_img.width - heart_size) // 2, (qr_img.height - heart_size) // 2)
        qr_img.paste(heart, pos_heart, mask=heart)

    # Marco con borde azul marino elegante
    border_width = 4
    frame_w = qr_img.width + 40
    frame_h = qr_img.height + 40
    frame = Image.new("RGBA", (frame_w, frame_h), "#0F172A")
    inner_white = Image.new("RGBA", (frame_w - (border_width * 2), frame_h - (border_width * 2)), "white")
    frame.paste(inner_white, (border_width, border_width))
    frame.paste(qr_img, (20, 20))

    qr_x = (width - frame_w) // 2
    card.paste(frame, (qr_x, 430))

    # 4. Textos Inferiores Llamativos (Naranja y Azul Marino)
    draw.text(
        (width // 2, 1330),
        "¿TE HA GUSTADO EL SERVICIO?",
        fill="#F97316",
        font=font_cta,
        anchor="mm",
    )

    draw.text(
        (width // 2, 1420),
        "Escanea con tu cámara",
        fill="#0F172A",
        font=font_sub,
        anchor="mm",
    )

    draw.text(
        (width // 2, 1490),
        "o acerca tu móvil aquí para dejar propina",
        fill="#64748B",
        font=font_small,
        anchor="mm",
    )

    # 5. Exportar PNG a 300 DPI
    buffer = io.BytesIO()
    card.save(buffer, format="PNG", dpi=(300, 300))
    return buffer.getvalue()
