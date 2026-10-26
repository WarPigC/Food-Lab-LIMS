import zipfile
import xml.etree.ElementTree as ET
import json
import sys
import os
import re

def format_date(d_str):
    if not d_str:
        return 'N/A'
    # if already DD/MM/YYYY
    if re.match(r'^\d{2}/\d{2}/\d{4}$', str(d_str)):
        return str(d_str)
    # if ISO date
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', str(d_str))
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"
    return str(d_str)

def format_signatory_name(name, fallback):
    if not name:
        return fallback
    trimmed = name.strip()
    if re.match(r'^(Mr\.|Ms\.|Dr\.|Mrs\.)', trimmed, re.I):
        return trimmed
    first = trimmed.split()[0].lower() if trimmed.split() else ''
    female_names = {'jyoti', 'monika', 'diksha', 'yogita', 'priyanka', 'nikita', 'vaishali', 'sakshi', 'divya', 'pooja', 'neha', 'anjali'}
    honorific = 'Ms.' if first in female_names else 'Mr.'
    return f"{honorific} {trimmed}"

def set_cell_text(tc, new_text, ns, bold=False, font_size="20", font_name="Times New Roman", center=False):
    for p in tc.findall('w:p', ns):
        tc.remove(p)
    p = ET.SubElement(tc, f"{{{ns['w']}}}p")
    pPr = ET.SubElement(p, f"{{{ns['w']}}}pPr")
    if center:
        jc = ET.SubElement(pPr, f"{{{ns['w']}}}jc")
        jc.set(f"{{{ns['w']}}}val", "center")
    
    r = ET.SubElement(p, f"{{{ns['w']}}}r")
    rPr = ET.SubElement(r, f"{{{ns['w']}}}rPr")
    if bold:
        ET.SubElement(rPr, f"{{{ns['w']}}}b")
    rFonts = ET.SubElement(rPr, f"{{{ns['w']}}}rFonts")
    rFonts.set(f"{{{ns['w']}}}ascii", font_name)
    rFonts.set(f"{{{ns['w']}}}hAnsi", font_name)
    sz = ET.SubElement(rPr, f"{{{ns['w']}}}sz")
    sz.set(f"{{{ns['w']}}}val", str(font_size))
    
    t = ET.SubElement(r, f"{{{ns['w']}}}t")
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    t.text = str(new_text) if new_text is not None else ''

def generate_report(template_path, job, report_type, output_path):
    ns = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    ET.register_namespace('w', ns['w'])
    
    with zipfile.ZipFile(template_path, 'r') as zin:
        files = {name: zin.read(name) for name in zin.namelist()}
        
    doc_root = ET.fromstring(files['word/document.xml'])
    hdr_root = ET.fromstring(files['word/header1.xml'])
    
    is_nabl = (report_type == 'nabl' or job.get('sample', {}).get('nabl_type') == 'Nabl')
    ulr_no = job.get('sample', {}).get('ulr_no', '')
    
    job_code = str(job.get('jobCode') or '')
    test_report_no = f"FTL/AIPER/26/{job_code[-4:]}" if len(job_code) >= 4 else f"FTL/AIPER/26/{job_code}"
    sample = job.get('sample') or {}
    customer = job.get('customer') or {}
    compliance = job.get('compliance') or {}
    
    reg_no = str(sample.get('registration_no') or job_code[-4:] or '650')
    
    fallback_date = sample.get('received_date') or job.get('createdAt')
    completed_at = job.get('completedAt') or fallback_date
    issue_date = format_date(completed_at)
    receipt_date = format_date(fallback_date)
    
    tp = job.get('testingPeriod') or {}
    tp_start = tp.get('startDate')
    tp_end = tp.get('endDate')
    if tp_start and tp_end:
        testing_period_str = f"{format_date(tp_start)} to {format_date(tp_end)}"
    else:
        testing_period_str = f"{receipt_date} to {issue_date}"
        
    # 1. Update Header (word/header1.xml)
    for p in hdr_root.findall('.//w:p', ns):
        txt = ''.join([t.text for t in p.findall('.//w:t', ns) if t.text])
        if 'FTL/AIPER/26/' in txt:
            for r in p.findall('w:r', ns):
                p.remove(r)
            r_rep = ET.SubElement(p, f"{{{ns['w']}}}r")
            rPr = ET.SubElement(r_rep, f"{{{ns['w']}}}rPr")
            rFonts = ET.SubElement(rPr, f"{{{ns['w']}}}rFonts")
            rFonts.set(f"{{{ns['w']}}}ascii", 'Times New Roman')
            rFonts.set(f"{{{ns['w']}}}hAnsi", 'Times New Roman')
            sz = ET.SubElement(rPr, f"{{{ns['w']}}}sz")
            sz.set(f"{{{ns['w']}}}val", '20')
            
            t_rep = ET.SubElement(r_rep, f"{{{ns['w']}}}t")
            t_rep.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            if is_nabl and ulr_no:
                spaces = ' ' * 106
                t_rep.text = f"{test_report_no}{spaces}ULR No. {ulr_no}"
            else:
                t_rep.text = test_report_no
                
    # If not NABL, clear the third cell of the header table (NABL logo/QR)
    if not is_nabl:
        hdr_tbl = hdr_root.find('.//w:tbl', ns)
        if hdr_tbl is not None:
            hdr_tr = hdr_tbl.find('w:tr', ns)
            if hdr_tr is not None:
                tcs = hdr_tr.findall('w:tc', ns)
                if len(tcs) >= 3:
                    nabl_tc = tcs[2]
                    for p in nabl_tc.findall('w:p', ns):
                        nabl_tc.remove(p)
                    # Add single empty paragraph
                    ET.SubElement(nabl_tc, f"{{{ns['w']}}}p")

    # 2. Update Table 0 (Customer & Sample info)
    body = doc_root.find('w:body', ns)
    tables = body.findall('w:tbl', ns)
    t0 = tables[0]
    t0_rows = t0.findall('w:tr', ns)
    
    cust_name = customer.get('customer_name') or job.get('clientName') or 'N/A'
    cust_addr = customer.get('customer_address') or 'N/A'
    contact_p = customer.get('contact_person') or ''
    contact_m = customer.get('mobile_number') or ''
    contact_str = f"{contact_p} , {contact_m}".strip(' ,') if (contact_p or contact_m) else 'N/A'
    cust_email = customer.get('email') or 'N/A'
    
    sample_name = sample.get('sample_name') or 'Drinking Water'
    product_cat = job.get('groupMetadata', {}).get('productCategory') or 'Drinking water'
    raw_qty = sample.get('sample_quantity') or '01x 1000g'
    sample_qty = raw_qty if (raw_qty.startswith('01x') or raw_qty.startswith('1x')) else f"01x {raw_qty}"
    packing = sample.get('packing_details') or 'Standard Lab Pouch'
    marking = sample.get('marking_seal') or 'Sealed'
    standard_spec = compliance.get('standard_specification') or 'IS 10500:2012'
    sampling_det = sample.get('sampling_details') or 'Sample provided by the customer'
    sample_cond = sample.get('condition_on_receipt') or 'Sealed & Intact'
    sample_desc = sample.get('sample_description') or 'N/A'
    
    # Table 0 Row 0: Customer info block
    tc0 = t0_rows[0].find('w:tc', ns)
    for p in tc0.findall('w:p', ns):
        tc0.remove(p)
        
    cust_lines = [
        ('Customer Name :  ', cust_name),
        ('Address :                ', cust_addr),
        ('Contact Person:\t', contact_str),
        ('Email  :                   ', cust_email),
    ]
    for prefix, val in cust_lines:
        p = ET.SubElement(tc0, f"{{{ns['w']}}}p")
        # Bold label
        r_pre = ET.SubElement(p, f"{{{ns['w']}}}r")
        rPr_pre = ET.SubElement(r_pre, f"{{{ns['w']}}}rPr")
        ET.SubElement(rPr_pre, f"{{{ns['w']}}}b")
        rFonts_pre = ET.SubElement(rPr_pre, f"{{{ns['w']}}}rFonts")
        rFonts_pre.set(f"{{{ns['w']}}}ascii", 'Times New Roman')
        rFonts_pre.set(f"{{{ns['w']}}}hAnsi", 'Times New Roman')
        sz_pre = ET.SubElement(rPr_pre, f"{{{ns['w']}}}sz")
        sz_pre.set(f"{{{ns['w']}}}val", '20')
        t_pre = ET.SubElement(r_pre, f"{{{ns['w']}}}t")
        t_pre.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t_pre.text = prefix
        
        # Value
        r_val = ET.SubElement(p, f"{{{ns['w']}}}r")
        rPr_val = ET.SubElement(r_val, f"{{{ns['w']}}}rPr")
        rFonts_val = ET.SubElement(rPr_val, f"{{{ns['w']}}}rFonts")
        rFonts_val.set(f"{{{ns['w']}}}ascii", 'Times New Roman')
        rFonts_val.set(f"{{{ns['w']}}}hAnsi", 'Times New Roman')
        sz_val = ET.SubElement(rPr_val, f"{{{ns['w']}}}sz")
        sz_val.set(f"{{{ns['w']}}}val", '20')
        t_val = ET.SubElement(r_val, f"{{{ns['w']}}}t")
        t_val.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t_val.text = str(val)

    # Table 0 Rows 1 to 7
    t0_mappings = [
        (1, 1, sample_name),
        (1, 3, reg_no),
        (2, 1, product_cat),
        (2, 3, issue_date),
        (3, 1, sample_qty),
        (3, 3, receipt_date),
        (4, 1, packing),
        (4, 3, testing_period_str),
        (5, 1, marking),
        (5, 3, standard_spec),
        (6, 1, sampling_det),
        (6, 3, sample_cond),
        (7, 1, sample_desc),
    ]
    for r_i, c_i, val in t0_mappings:
        tc = t0_rows[r_i].findall('w:tc', ns)[c_i]
        set_cell_text(tc, val, ns)

    # 3. Update Continuation Banners
    # Standalone banners: Table 2, Table 4, Table 7
    standalone_banners = [tables[2], tables[4], tables[7]]
    for tbl in standalone_banners:
        rows = tbl.findall('w:tr', ns)
        set_cell_text(rows[0].findall('w:tc', ns)[1], sample_name, ns)
        set_cell_text(rows[0].findall('w:tc', ns)[3], reg_no, ns)
        set_cell_text(rows[1].findall('w:tc', ns)[1], product_cat, ns)
        set_cell_text(rows[1].findall('w:tc', ns)[3], issue_date, ns)
        
    # Embedded banners: Table 5 (rows 19, 20), Table 8 (rows 21, 22), Table 9 (rows 17, 18)
    t5_rows = tables[5].findall('w:tr', ns)
    set_cell_text(t5_rows[19].findall('w:tc', ns)[1], sample_name, ns)
    set_cell_text(t5_rows[19].findall('w:tc', ns)[3], reg_no, ns)
    set_cell_text(t5_rows[20].findall('w:tc', ns)[1], product_cat, ns)
    set_cell_text(t5_rows[20].findall('w:tc', ns)[3], issue_date, ns)

    t8_rows = tables[8].findall('w:tr', ns)
    set_cell_text(t8_rows[21].findall('w:tc', ns)[1], sample_name, ns)
    set_cell_text(t8_rows[21].findall('w:tc', ns)[3], reg_no, ns)
    set_cell_text(t8_rows[22].findall('w:tc', ns)[1], product_cat, ns)
    set_cell_text(t8_rows[22].findall('w:tc', ns)[3], issue_date, ns)

    t9_rows = tables[9].findall('w:tr', ns)
    set_cell_text(t9_rows[17].findall('w:tc', ns)[1], sample_name, ns)
    set_cell_text(t9_rows[17].findall('w:tc', ns)[3], reg_no, ns)
    set_cell_text(t9_rows[18].findall('w:tc', ns)[1], product_cat, ns)
    set_cell_text(t9_rows[18].findall('w:tc', ns)[3], issue_date, ns)

    # 4. Update Test Result Cells in Parameter Tables (Tables 1, 3, 5, 6, 8, 9, 10)
    job_param_map = {}
    for p in job.get('parameters', []):
        if p.get('name'):
            # normalize name
            norm_name = re.sub(r'[\s\-_]+', '', p['name'].lower())
            job_param_map[norm_name] = p

    results_tables = [1, 3, 5, 6, 8, 9, 10]
    for t_idx in results_tables:
        t = tables[t_idx]
        for r in t.findall('w:tr', ns):
            tcs = r.findall('w:tc', ns)
            if len(tcs) in [6, 7]:
                name = ''.join([elem.text for elem in tcs[1].findall('.//w:t', ns) if elem.text]).strip()
                if not name or name in ['Test Parameters', 'WaterSub Group - Drinking water', 'Drinking water', 'Group - Water'] or 'Group' in name:
                    continue
                norm_name = re.sub(r'[\s\-_]+', '', name.lower())
                if norm_name in job_param_map:
                    match = job_param_map[norm_name]
                    val = match.get('value')
                    if val is None or str(val).strip() == '':
                        val = match.get('result')
                    if val is not None and str(val).strip() != '':
                        set_cell_text(tcs[3], str(val), ns, center=True)

    # 5. Enforce Invariant 8-Page Structure with Page Breaks
    # Page 1 -> Page 2: Table 1 row 13 (Copper)
    r13 = tables[1].findall('w:tr', ns)[13]
    p_r13 = r13.find('.//w:p', ns)
    if p_r13 is not None:
        pPr = p_r13.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_r13.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # Page 2 -> Page 3: Table 4 (Continuation Banner)
    p_t4 = tables[4].find('.//w:p', ns)
    if p_t4 is not None:
        pPr = p_t4.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_t4.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # Page 3 -> Page 4: Table 6 (PCB 180)
    p_t6 = tables[6].find('.//w:p', ns)
    if p_t6 is not None:
        pPr = p_t6.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_t6.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # Page 4 -> Page 5: Table 7 (Continuation Banner)
    p_t7 = tables[7].find('.//w:p', ns)
    if p_t7 is not None:
        pPr = p_t7.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_t7.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # Page 5 -> Page 6: Table 9 (Malathion)
    p_t9 = tables[9].find('.//w:p', ns)
    if p_t9 is not None:
        pPr = p_t9.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_t9.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # Page 6 -> Page 7: Table 10 (Biological: Total Coliform)
    p_t10 = tables[10].find('.//w:p', ns)
    if p_t10 is not None:
        pPr = p_t10.find('w:pPr', ns)
        if pPr is None:
            pPr = ET.Element(f"{{{ns['w']}}}pPr")
            p_t10.insert(0, pPr)
        if pPr.find('w:pageBreakBefore', ns) is None:
            ET.SubElement(pPr, f"{{{ns['w']}}}pageBreakBefore")

    # 6. Update Signatures
    analyst_name = format_signatory_name(job.get('assignedAnalyst'), 'Ms. Diksha Dwivedi')
    dist = job.get('distribution') or {}
    chem_dist = dist.get('chemical') or {}
    chem_head_obj = chem_dist.get('assignedHead') or {}
    chem_head = format_signatory_name(chem_head_obj.get('name'), 'Ms. Monika Pali')
    
    micro_dist = dist.get('micro') or {}
    micro_head_obj = micro_dist.get('assignedHead') or {}
    micro_head = format_signatory_name(micro_head_obj.get('name'), 'Ms. Jyoti Pathak')
    
    for p in body.findall('w:p', ns):
        txt = ''.join([t.text for t in p.findall('.//w:t', ns) if t.text])
        if 'Reviewed By' in txt and 'Authorized Signatory' in txt:
            # Paragraph 36 has Reviewed By / Authorized Signatory labels and names
            for r in p.findall('w:r', ns):
                p.remove(r)
            r = ET.SubElement(p, f"{{{ns['w']}}}r")
            rPr = ET.SubElement(r, f"{{{ns['w']}}}rPr")
            rFonts = ET.SubElement(rPr, f"{{{ns['w']}}}rFonts")
            rFonts.set(f"{{{ns['w']}}}ascii", 'Times New Roman')
            rFonts.set(f"{{{ns['w']}}}hAnsi", 'Times New Roman')
            sz = ET.SubElement(rPr, f"{{{ns['w']}}}sz")
            sz.set(f"{{{ns['w']}}}val", '20')
            
            t = ET.SubElement(r, f"{{{ns['w']}}}t")
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            # Format 3 columns with spaces matching template layout
            col1 = f"Reviewed By\n{analyst_name}"
            col2 = f"Authorized Signatory\n{chem_head}"
            col3 = f"Authorized Signatory\n{micro_head}"
            sp1 = ' ' * 45
            sp2 = ' ' * 28
            line1 = f"Reviewed By{sp1}Authorized Signatory{sp2}Authorized Signatory"
            line2 = f"{analyst_name}{sp1}{chem_head}{sp2}{micro_head}"
            t.text = f"{line1}\n\n\n\n{line2}"

    # 7. Write Back Modified XML Files into New Docx
    files['word/document.xml'] = ET.tostring(doc_root, encoding='utf-8')
    files['word/header1.xml'] = ET.tostring(hdr_root, encoding='utf-8')
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, data in files.items():
            zout.writestr(name, data)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: uv run python3 waterIsoGenerator.py <input_json> <output_docx>")
        sys.exit(1)
        
    input_json_path = sys.argv[1]
    output_docx_path = sys.argv[2]
    
    with open(input_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    job_data = data.get('job', {})
    report_type_val = data.get('reportType', 'nabl')
    
    template_file = os.path.join(os.path.dirname(__file__), '../assets/templates/waterIso10500Template.docx')
    if not os.path.exists(template_file):
        template_file = os.path.join(os.path.dirname(__file__), '../../temp/report/Water iso 10500.docx')
        
    generate_report(template_file, job_data, report_type_val, output_docx_path)
