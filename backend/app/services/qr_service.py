import io
import qrcode
from PIL import Image, ImageDraw, ImageFont


def generate_table_card_png(
    url: str, location_name: str, business_name: str
) -> bytes:
    # Dimensiones A6 a 300 DPI (10.5 x 14.8 cm para imprenta/mesas)
    width, height = 1240, 1748
    card = Image.new("RGBA", (width, height), "#0F172A")
    draw = ImageDraw.Draw(card)

    try:
        font_title = ImageFont.truetype("assets/fonts/Inter-Bold.ttf", 64)
        font_sub = ImageFont.truetype("assets/fonts/Inter-Medium.ttf", 42)
        font_cta = ImageFont.truetype("assets/fonts/Inter-Bold.ttf", 40)
        font_small = ImageFont.truetype("assets/fonts/Inter-Regular.ttf", 34)
    except IOError:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_cta = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Logo / Marca superior
    try:
        logo = Image.open("assets/propi-logo.png").convert("RGBA")
        logo_w = 340
        aspect_ratio = logo.height / logo.width
        logo = logo.resize(
            (logo_w, int(logo_w * aspect_ratio)), Image.Resampling.LANCZOS
        )
        card.paste(logo, ((width - logo_w) // 2, 100), mask=logo)
    except IOError:
        draw.text(
            (width // 2, 120),
            "🧡 propi",
            fill="#F97316",
            font=font_title,
            anchor="mm",
        )

    # Nombres
    draw.text(
        (width // 2, 280), business_name, fill="white", font=font_title, anchor="mm"
    )
    draw.text(
        (width // 2, 350),
        location_name,
        fill="#94A3B8",
        font=font_sub,
        anchor="mm",
    )

    # QR
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=18,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white").convert(
        "RGBA"
    )

    try:
        heart = Image.open("assets/propi-heart.png").convert("RGBA")
        heart_size = int(qr_img.width * 0.22)
        heart = heart.resize(
            (heart_size, heart_size), Image.Resampling.LANCZOS
        )
        pos = ((qr_img.width - heart_size) // 2, (qr_img.height - heart_size) // 2)
        qr_img.paste(heart, pos, mask=heart)
    except IOError:
        pass

    # Marco blanco
    frame_padding = 40
    frame_w = qr_img.width + (frame_padding * 2)
    frame_h = qr_img.height + (frame_padding * 2)
    frame = Image.new("RGBA", (frame_w, frame_h), "white")
    frame.paste(qr_img, (frame_padding, frame_padding))

    qr_x = (width - frame_w) // 2
    card.paste(frame, (qr_x, 440))

    # Textos inferiores
    draw.text(
        (width // 2, 1340),
        "¿TE HA GUSTADO EL SERVICIO?",
        fill="#F97316",
        font=font_cta,
        anchor="mm",
    )

    draw.text(
        (width // 2, 1430),
        "Escanea con tu cámara",
        fill="white",
        font=font_sub,
        anchor="mm",
    )

    draw.text(
        (width // 2, 1500),
        "o acerca tu móvil aquí 📲",
        fill="#94A3B8",
        font=font_small,
        anchor="mm",
    )

    buffer = io.BytesIO()
    card.save(buffer, format="PNG", dpi=(300, 300))
    return buffer.getvalue()
