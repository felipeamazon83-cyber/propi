import io
import qrcode
from PIL import Image, ImageDraw, ImageFont


# --- Función original para el QR simple ---
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


# --- Nueva función para la tarjeta/peana de mesa (A6 300 DPI) ---
def generate_table_card_png(
    url: str, location_name: str, business_name: str
) -> bytes:
    # 1. Tamaño A6 en píxeles a 300 DPI (alta resolución para imprenta)
    width, height = 1240, 1748
    card = Image.new("RGBA", (width, height), "#0F172A")
    draw = ImageDraw.Draw(card)

    # 2. Cargar fuentes con respaldo en caso de no encontrar archivos .ttf
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

    # 3. Logo o texto superior de Propi
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

    # 4. Nombres del negocio y la ubicación/mesa
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

    # 5. Generar QR de alta precisión
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

    # Insertar logo del corazón en el centro del QR si existe
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

    # Marco blanco alrededor del QR
    frame_padding = 40
    frame_w = qr_img.width + (frame_padding * 2)
    frame_h = qr_img.height + (frame_padding * 2)
    frame = Image.new("RGBA", (frame_w, frame_h), "white")
    frame.paste(qr_img, (frame_padding, frame_padding))

    qr_x = (width - frame_w) // 2
    card.paste(frame, (qr_x, 440))

    # 6. Textos inferiores de llamada a la acción
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

    # 7. Retornar en formato PNG
    buffer = io.BytesIO()
    card.save(buffer, format="PNG", dpi=(300, 300))
    return buffer.getvalue()
