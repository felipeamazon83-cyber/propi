import qrcode
from io import BytesIO
def png(url:str)->bytes:
 image=qrcode.make(url); buffer=BytesIO();image.save(buffer,'PNG');return buffer.getvalue()
