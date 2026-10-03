import os
from PIL import Image, ImageDraw, ImageFont

def get_font(size, bold=False):
    try:
        font_path = 'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'
        if os.path.exists(font_path):
            return ImageFont.truetype(font_path, size)
        return ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()

def add_diagonal_watermark(img, text="SAMPLE - DUMMY DATA", alpha=28, size=46):
    w, h = img.size
    txt_img = Image.new('RGBA', (800, 140), (255, 255, 255, 0))
    td = ImageDraw.Draw(txt_img)
    td.text((40, 35), text, fill=(220, 38, 38, alpha), font=get_font(size, bold=True))
    rotated_txt = txt_img.rotate(24, expand=1, resample=Image.Resampling.BICUBIC)
    
    img.paste(rotated_txt, ((w - rotated_txt.size[0]) // 2, (h - rotated_txt.size[1]) // 2), rotated_txt)

def generate_death_certificate(out_path):
    width, height = 1200, 1500
    img = Image.new('RGB', (width, height), color='#FCFBF7')
    draw = ImageDraw.Draw(img)

    # Borders
    draw.rectangle([30, 30, width - 30, height - 30], outline='#1B2A41', width=6)
    draw.rectangle([40, 40, width - 40, height - 40], outline='#8B5E34', width=2)
    draw.rectangle([46, 46, width - 46, height - 46], outline='#1B2A41', width=1)

    # Top sample watermark banner
    draw.rectangle([width // 2 - 180, 50, width // 2 + 180, 78], fill='#FEE2E2', outline='#DC2626', width=1)
    draw.text((width // 2, 55), "SAMPLE - DUMMY DATA FOR DEMO ONLY", fill='#B91C1C', font=get_font(14, bold=True), anchor='mt')

    # Header Box
    draw.rectangle([55, 88, width - 55, 235], fill='#F1F4F9', outline='#2A3F5F', width=2)
    draw.text((width // 2, 102), "GOVERNMENT OF INDIA - MINISTRY OF DEFENCE", fill='#1B2A41', font=get_font(25, bold=True), anchor='mt')
    draw.text((width // 2, 138), "MILITARY CASUALTY & DEATH CERTIFICATE", fill='#8B0000', font=get_font(33, bold=True), anchor='mt')
    draw.text((width // 2, 190), "ARMED FORCES RECORD OFFICE & MEDICAL SERVICES", fill='#2A3F5F', font=get_font(20, bold=True), anchor='mt')

    # Sub-header meta line
    draw.text((65, 255), "Certificate No: CAS-REC/2022/DL-091823", fill='#333333', font=get_font(19, bold=True))
    draw.text((width - 65, 255), "Date of Issue: 25-AUG-2022", fill='#333333', font=get_font(19, bold=True), anchor='rt')
    draw.line([55, 288, width - 55, 288], fill='#1B2A41', width=2)

    # Preamble statement
    p1 = "This is to officially certify from military service records that the undermentioned Armed Forces"
    p2 = "personnel made the supreme sacrifice in the line of duty:"
    draw.text((65, 302), p1, fill='#1B2A41', font=get_font(19))
    draw.text((65, 328), p2, fill='#1B2A41', font=get_font(19))

    # Details Table
    fields = [
        ("FULL NAME OF SOLDIER", "RAHUL SHARMA"),
        ("SERVICE NUMBER", "IND-883921"),
        ("RANK AT TIME OF CASUALTY", "Subedar"),
        ("ARM / REGIMENT / UNIT", "5th Rajputana Rifles"),
        ("DATE OF DEATH / CASUALTY", "15-AUG-2022"),
        ("PLACE OF CASUALTY", "Field Ops Sector-4, J&K"),
        ("OFFICIAL CAUSE CATEGORY", "Battle Casualty (Killed in Action)"),
        ("NEXT OF KIN / SPOUSE", "PRIYA SHARMA (Veer Nari / Widow)"),
        ("DEPENDENT FAMILY MEMBERS", "2 Dependent Children"),
        ("PENSION RECORD REF", "PPO-DL-883921-MIL"),
        ("ISSUING WELFARE AUTHORITY", "Record Office Delhi"),
    ]

    table_top = 365
    row_height = 65
    col_split = 440

    for i, (label, val) in enumerate(fields):
        y = table_top + (i * row_height)
        bg_col = '#F5F7FA' if i % 2 == 0 else '#FFFFFF'
        draw.rectangle([60, y, width - 60, y + row_height], fill=bg_col, outline='#CBD5E1', width=1)
        
        draw.text((80, y + 20), label, fill='#2A3F5F', font=get_font(19, bold=True))
        is_highlight = label in ["FULL NAME OF SOLDIER", "SERVICE NUMBER", "OFFICIAL CAUSE CATEGORY"]
        val_color = '#8B0000' if is_highlight else '#0F172A'
        draw.text((col_split + 20, y + 18), val, fill=val_color, font=get_font(22, bold=True))

    # Notes section
    notes_y = table_top + (len(fields) * row_height) + 25
    draw.rectangle([60, notes_y, width - 60, notes_y + 115], fill='#FEFCE8', outline='#FEF08A', width=2)
    draw.text((80, notes_y + 15), "OFFICIAL VERIFICATION NOTICE:", fill='#854D0E', font=get_font(18, bold=True))
    n1 = "Verified from Part II Order No. 441/2022. This casualty certificate serves as official proof of service death for"
    n2 = "sanctioning Liberalized Family Pension, ex-gratia, and welfare entitlements as per Government of India regulations."
    draw.text((80, notes_y + 44), n1, fill='#713F12', font=get_font(17))
    draw.text((80, notes_y + 70), n2, fill='#713F12', font=get_font(17))

    # Signatures & Seal Section
    seal_y = notes_y + 140
    
    # Official Seal (Circular stamp)
    draw.ellipse([120, seal_y, 280, seal_y + 160], outline='#1D4ED8', width=3)
    draw.ellipse([130, seal_y + 10, 270, seal_y + 150], outline='#1D4ED8', width=1)
    draw.text((200, seal_y + 40), "DEFENCE", fill='#1D4ED8', font=get_font(18, bold=True), anchor='mt')
    draw.text((200, seal_y + 68), "RECORD OFFICE", fill='#1D4ED8', font=get_font(15, bold=True), anchor='mt')
    draw.text((200, seal_y + 96), "DELHI AREA", fill='#1D4ED8', font=get_font(16, bold=True), anchor='mt')

    # Authority Signature
    sig_x = width - 420
    draw.line([sig_x, seal_y + 20, sig_x + 320, seal_y + 20], fill='#0F172A', width=2)
    draw.text((sig_x, seal_y + 30), "Col. V. K. Malhotra", fill='#0F172A', font=get_font(22, bold=True))
    draw.text((sig_x, seal_y + 60), "Senior Adjutant / Record Officer", fill='#334155', font=get_font(18))
    draw.text((sig_x, seal_y + 85), "Record Office Delhi, Army Headquarters", fill='#334155', font=get_font(17))

    # Bottom watermark badge
    draw.rectangle([width // 2 - 160, height - 75, width // 2 + 160, height - 48], fill='#FEE2E2', outline='#DC2626', width=1)
    draw.text((width // 2, height - 70), "SAMPLE - DUMMY DATA", fill='#B91C1C', font=get_font(15, bold=True), anchor='mt')

    # Diagonal watermark
    add_diagonal_watermark(img, "SAMPLE - DUMMY DATA", alpha=26, size=48)

    img.save(out_path, format='JPEG', quality=95)
    print(f"Generated clean death certificate: {out_path} ({os.path.getsize(out_path)} bytes)")

def generate_id_proof(out_path):
    width, height = 1200, 850
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)

    # Frame
    draw.rectangle([25, 25, width - 25, height - 25], outline='#1B2A41', width=6)
    draw.rectangle([35, 35, width - 35, height - 35], outline='#CBD5E1', width=2)

    # Top sample banner
    draw.rectangle([width // 2 - 170, 38, width // 2 + 170, 64], fill='#FEE2E2', outline='#DC2626', width=1)
    draw.text((width // 2, 42), "SAMPLE - DUMMY DATA ONLY", fill='#B91C1C', font=get_font(13, bold=True), anchor='mt')

    # Header Ribbon
    draw.rectangle([37, 72, width - 37, 185], fill='#1B2A41')
    draw.text((width // 2, 84), "GOVERNMENT OF INDIA - MINISTRY OF DEFENCE", fill='#F8FAFC', font=get_font(24, bold=True), anchor='mt')
    draw.text((width // 2, 118), "ARMED FORCES DEPENDENT IDENTITY & WELFARE CARD", fill='#FEF08A', font=get_font(30, bold=True), anchor='mt')
    draw.text((width // 2, 155), "ISSUED UNDER DEPARTMENT OF EX-SERVICEMEN WELFARE (DESW)", fill='#CBD5E1', font=get_font(16, bold=True), anchor='mt')

    # Photo Box
    photo_box = [65, 215, 310, 505]
    draw.rectangle(photo_box, fill='#E2E8F0', outline='#64748B', width=2)
    draw.text((187, 340), "PASSPORT\nPHOTO\n[SAMPLE]", fill='#475569', font=get_font(22, bold=True), anchor='mm', align='center')

    # Card Number Banner
    draw.rectangle([65, 525, 310, 585], fill='#EEF2F6', outline='#94A3B8', width=1)
    draw.text((187, 538), "ID CARD NUMBER:", fill='#475569', font=get_font(14, bold=True), anchor='mt')
    draw.text((187, 558), "DEF-883921-VEER", fill='#1E3A8A', font=get_font(18, bold=True), anchor='mt')

    # Main Grid
    info_x = 345
    labels_vals = [
        ("NAME OF CARD HOLDER", "PRIYA SHARMA"),
        ("RELATIONSHIP", "Veer Nari (Spouse of Martyr)"),
        ("NAME OF MARTYR / SOLDIER", "RAHUL SHARMA"),
        ("SERVICE NUMBER", "IND-883921"),
        ("RANK & REGIMENT", "Subedar / 5th Rajputana Rifles"),
        ("DATE OF CASUALTY", "15-AUG-2022 (Battle Casualty)"),
        ("REGISTERED DEPENDENTS", "2 Children"),
        ("ISSUING AUTHORITY", "Record Office Delhi / ZSWO"),
        ("AADHAAR REFERENCE", "XXXX-XXXX-9482 (Sample Verified)"),
    ]

    start_y = 210
    gap_y = 47
    for i, (label, val) in enumerate(labels_vals):
        y = start_y + (i * gap_y)
        if i % 2 == 0:
            draw.rectangle([info_x - 5, y - 4, width - 60, y + 39], fill='#F8FAFC')
        draw.text((info_x, y + 6), label + ":", fill='#334155', font=get_font(18, bold=True))
        
        is_key = label in ["NAME OF MARTYR / SOLDIER", "SERVICE NUMBER", "DATE OF CASUALTY"]
        val_col = '#8B0000' if is_key else '#0F172A'
        draw.text((info_x + 310, y + 4), val, fill=val_col, font=get_font(21, bold=True))

    # Bottom Footer Bar
    draw.line([37, height - 165, width - 37, height - 165], fill='#CBD5E1', width=2)
    draw.text((65, height - 145), "Validity: Permanent Veer Nari Card", fill='#1B2A41', font=get_font(17, bold=True))
    draw.text((65, height - 118), "Entitled to ECHS medical care, priority canteen, and state ex-gratia benefits.", fill='#475569', font=get_font(16))
    draw.text((65, height - 90), "This card is recognized by all Record Offices and Zila Sainik Welfare Offices.", fill='#475569', font=get_font(15))

    # Stamp Box
    stamp_box_x = width - 340
    draw.rectangle([stamp_box_x, height - 150, width - 65, height - 55], fill='#F1F5F9', outline='#94A3B8', width=1)
    draw.text((stamp_box_x + 137, height - 138), "VERIFIED & ISSUED BY", fill='#64748B', font=get_font(13, bold=True), anchor='mt')
    draw.text((stamp_box_x + 137, height - 115), "OFFICER-IN-CHARGE", fill='#0F172A', font=get_font(16, bold=True), anchor='mt')
    draw.text((stamp_box_x + 137, height - 88), "RECORD OFFICE DELHI", fill='#1E3A8A', font=get_font(15, bold=True), anchor='mt')

    # Diagonal watermark
    add_diagonal_watermark(img, "SAMPLE - DUMMY DATA", alpha=24, size=46)

    img.save(out_path, format='JPEG', quality=95)
    print(f"Generated clean ID proof: {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    samples_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'samples')
    os.makedirs(samples_dir, exist_ok=True)
    
    death_cert_path = os.path.join(samples_dir, 'dummy_death_certificate.jpg')
    id_proof_path = os.path.join(samples_dir, 'dummy_id_proof.jpg')
    
    generate_death_certificate(death_cert_path)
    generate_id_proof(id_proof_path)
