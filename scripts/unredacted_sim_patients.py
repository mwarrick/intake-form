"""Three fictional patients for scripts/make_unredacted_sims.py.

Every name, number and address here is made up: phone numbers use 555-01xx, emails use .test domains,
and the hospitals do not exist. The clinical stories follow the shape of a real 31-page fax packet
(samples/packets-real/R11.pdf) so the simulated packets exercise the same documents, unredacted.
"""

PATIENTS = [
    # 1. Mirrors the real packet: scalp cellulitis / kerion, alcohol use, depression, anemia.
    {
        "slug": "001",
        "last": "WHITFIELD", "first": "GERALD", "mi": "A", "sex": "Male", "age": 63, "dob": "03/22/1963",
        "mrn": "70418823", "account": "900184227113", "ssn4": "4471", "ssn": "XXX-XX-4471",
        "address": "1810 E 1st St (mailing - Mercy House)", "city": "Santa Ana, CA 92701", "phone": "714-555-0187",
        "language": "English", "english": True, "ethnicity": "Black", "marital": "Single", "religion": "Baptist",
        "homeless": True, "homeless_long": True,
        "hospital": "Harbor Vista Medical Center", "hospital_short": "HARBOR VISTA MC",
        "hosp_addr": "2401 Harbor Vista Dr, Santa Ana, CA 92704", "hosp_phone": "714-555-0100", "hosp_fax": "714-555-0199",
        "hosp_npi": "1588012346", "unit": "4 West", "bed": "412-B", "nursing_phone": "714-555-0141",
        "referrer": "Monica Alvarez, MSW", "referrer_first": "Monica", "referrer_phone": "714-555-0142",
        "referrer_email": "malvarez@harborvista.test", "authorized_by": "Dr. Priya Raman", "authorized_phone": "714-555-0150",
        "admit": "10/10/2026", "admit_time": "10/10/2026 18:42", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Priya Raman, MD", "attending": "Priya Raman, MD", "referring_md": "Kevin Ostrander, DO",
        "pcp": "Lena Haddad, MD", "pcp_phone": "714-555-0163", "pcp_addr": "1120 W Warner Ave, Santa Ana, CA 92707",
        "consultant": "Samuel Okoye, MD", "consult_specialty": "Infectious Diseases",
        "wound_rn": "Teresa Lindqvist, RN, CWOCN", "sw": "Monica Alvarez, MSW", "hp_author": "Priya Raman, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health Medi-Cal", "member_id": "91827364A", "cin": "91827364A",
        "health_id": "CO-4471-9182", "group": "MCAL-OC", "aid_code": "M1", "guarantor_status": "DISABLED",
        "emergency": ("Darlene Whitfield", "Sister", "714-555-0119"),
        "chief_complaint": "HEADACHE",
        "form_cc": "Cellulitis of scalp, kerion of occipital region of scalp, chest pain",
        "qual_dx": "Kerion, anemia, hypertension",
        "adm_dx": ["Cellulitis of scalp [L03.811]", "Kerion of occipital region of scalp [B35.0]", "Chest pain, unspecified type [R07.9]"],
        "wound": True, "wound_desc": "Head - lower/posterior, medial", "wound_independent": True,
        "substances": {"Alcohol": "10/10/2026"}, "withdrawals": False,
        "mh": ["Anxiety", "Depression"], "mh_type": "depression", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": False, "insulin": False, "anticoag": False,
        "ambulatory": True, "device": None, "car": False, "partner": False, "service_animal": False,
        "tb": None, "communicable": "None", "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "SW notes"],
        "cover_msg": "Attached is application and documentation for RECUP Care referral. Medications ordered and to be "
                     "delivered at bedside. Still awaiting Physical Therapy evaluation and Nurse ADL note; will send as soon "
                     "as available. Patient pending discharge tomorrow 10/15/2026. Discharge Summary to be sent when "
                     "completed. Patient does not require home health services.",
        "pmh": ["Blindness of right eye", "Hearing impaired person, right", "Homeless", "Hypertension", "Knee pain, right",
                "Low back pain"],
        "psh": "History reviewed. No pertinent surgical history.",
        "sched_meds": ["amLODIPINE, 10 mg, Oral, Daily", "atorvastatin, 80 mg, Oral, Daily", "escitalopram, 20 mg, Oral, Daily",
                       "hydroCHLOROthiazide, 25 mg, Oral, Daily", "melatonin, 5 mg, Oral, HS",
                       "piperacillin-tazobactam (Zosyn) 3.375 g in sodium chloride 0.9% 50 mL IVPB, 3.375 g, IntraVENOUS, Q8H NR",
                       "vancomycin (Vancocin) IVPB, 1,750 mg, IntraVENOUS, Q12H NR"],
        "prn_meds": ["acetaminophen, 650 mg, Q6H PRN", "HYDROcodone-acetaminophen, 1 tablet, Q4H PRN", "morphine, 2 mg, Q4H PRN",
                     "ondansetron, 4 mg, Q4H PRN"],
        "allergies": "No Known Allergies",
        "alcohol": ("Yes", "12 - 28", "4 or more times a week", "3 or 4", "Monthly"), "tobacco": "Never", "drugs": "Never",
        "weight": "130.2 kg (287 lb)", "bmi": "41.6",
        "vitals_hp": {"BP": "(!) 165/75", "Pulse": "92", "Resp": "18", "Temp": "37.1 °C (98.8 °F)", "SpO2": "95%"},
        "vitals_pn": {"BP": "(!) 143/63", "Pulse": "84", "Resp": "19", "Temp": "36.8 °C (98.2 °F)", "SpO2": "99%"},
        "hp_hpi": "Gerald Whitfield is a 63 years old male presenting with scalp infection not improving. He specifically "
                  "presented with occipital swelling and tenderness. He was seen at Westside Urgent Care ER a week ago and "
                  "diagnosed with a Kerion and prescribed an antifungal. Patient states he hit the back of his head 3 days ago "
                  "worsening the pain-- it may have been a syncopal episode. Also developed left-sided chest pain while walking "
                  "today, no radiation, no shortness of breath, sweats or nausea, no history of myocardial infarction. Pain has "
                  "resolved. In our ER, Hb was 7.5 (baseline unknown) and wbc was 13.2. Na 134. CT Neck showed R upper neck and "
                  "lower scalp cellulitis w/ no obvious abscess. He was started on IV abx.",
        "problems": ["Cellulitis of scalp", "Recently Diagnosed Kerion", "HTN", "Anemia (Microcytic)", "Obesity"],
        "plan_lines": ["---  Abx broad spectrum IV", "--- Likely Antifungal as well, ID eval, monitor closely",
                       "--- for anemia, monitor h/h --- r/o GI bleed, check stool for blood,", "Consider transfusion and GI eval."],
        "pn_update": "10/13: In essence cleared by ID for dc on oral abx and will need outpt Derm Bx, transfuse 1 u PRBC's, "
                     "f/u Stool for occult blood.",
        "pn_interval": "Pt in good spirits, pain controlled, for 1 u prbc's.",
        "exam_extra": "Back of neck bandaged.",
        # Two-page document after the face sheet: a wound care note (or PT eval when there is no wound).
        "doc2_kind": "wound",
        "doc2": {
            "subjective": "Per H&P- 63 years old male presenting with scalp infection not improving. He specifically presented "
                          "with occipital swelling and tenderness. He was seen at Westside Urgent Care a week ago and diagnosed "
                          "with a Kerion and prescribed an antifungal. Patient states he hit the back of his head 3 days ago "
                          "worsening the pain-- it may have been a syncopal episode.",
            "objective": ["Patient awake, alert, pleasant, and agreeable to wound care",
                          "Wound culture: Growing Staphylococcus aureus",
                          "Imaging: CT of Neck with Contrast- Edema is identified in the subcutaneous tissues of the right "
                          "suboccipital scalp, extending to the right upper neck. There is prominence of some of the fascia. "
                          "No focal fluid collection or mass is seen.", "Allergies: NKA"],
            "location": "RIGHT OCCIPITAL SCALP", "measure": "1 X 1 X 0.5 cm", "undermining": "0.3 cm circumferential",
            "tunneling": "None", "bed": "Red, moist", "periwound": "pink", "drainage": "moderate purulent amount",
            "care": "Cleansed with wound cleanser, Therahoney applied to wound bed, lightly packed with 1/4\" Iodoform packing "
                    "strip, covered with foam bordered dressing.",
            "plan": "Continue daily wound care: Cleanse with wound cleanser, apply Therahoney to wound bed, lightly pack the "
                    "wound cavity with 1/4\" Iodoform packing strip, cover with foam bordered dressing. The wound care team will "
                    "sign off; nurse to continue dressing changes. The wound care team remains available for support.",
        },
        "consult": {
            "reason": "I was asked to see the patient for antibiotic recommendations",
            "cc": "Scalp lesion",
            "hpi": "Patient presented to the ER with a scalp lesion going on for 2 years also was noted to be anemic-patient "
                   "states something heavy was thrown on his head 2 years ago when he was staying at a shelter in Anaheim. "
                   "Since he's had these lesions he's seen two dermatologists-it does not look like any skin biopsies were done "
                   "but we do not have any results-patient states that neither of the dermatologist's were able to diagnose what "
                   "is going on-he went to Westside Urgent Care and was told he had tenia capitis infection. He does not seem to "
                   "have been on any antifungal therapy. Denies fevers or chills but he's complaining of drainage from the scalp.",
            "ros": "Skin: Positive for wound.",
            "exam": ["General: Awake alert no acute distress", "HEENT: Scalp dressing present photographs reviewed in the chart on epic",
                     "Neck: Supple", "Chest: Clear breath sounds bilaterally", "Cardiovascular: Regular rate rhythm S1-S2 present",
                     "Abdomen: Soft no guarding no rigidity bowel sounds present", "Extremities: No edema"],
            "imaging": [("CT Head WO/W Contrast", "10/10/2026", "Mild atrophy with chronic changes of the brain. No acute "
                         "intracranial process. Soft tissue edema. Cellulitis could be considered. No abscess is seen."),
                        ("CT Soft Tissue Neck With Contrast", "10/10/2026", "Edema in the subcutaneous tissues of the right upper "
                         "neck and lower scalp. Cellulitis could be considered. No abscess is seen. Nonspecific reactive cervical "
                         "lymph nodes."),
                        ("X-Ray Chest Single View", "10/10/2026", "Normal chest. No acute cardiopulmonary process.")],
            "assessment": ["-Potential tinea capitis infection of the scalp versus allergic contact dermatitis based on the "
                           "history-already seen 2 dermatologists but no skin biopsy done per patient although records not "
                           "available to review", "-secondary bacterial cellulitis with ongoing drainage",
                           "-leukocytosis rule out from infection or from profound anemia"],
            "plan": ["-Typical scalp bacteria causing infection would be Staph aureus or strep change to IV Ancef",
                     "-patient needs to see a dermatologist as soon as possible on discharge to consider doing a skin biopsy to be "
                     "100% sure this is just a tinea infection and not something else-treatment is outpatient and I would not "
                     "recommend any antifungal therapy until the diagnosis is confirmed by skin biopsy or by clinical judgment by "
                     "dermatologist-since this is a non life-threatening infection from an ID point he can discharge",
                     "-on discharge recommend p.o. Keflex 500 mg every 12 hours for 1 week along with wound care and urgent "
                     "referral to Dermatology", "-can stop vancomycin and Zosyn", "-continue wound care",
                     "-this was discussed with the patient and the nurse."],
        },
        "sw_note": [
            "SW acknowledged SS consult for homelessness.",
            "Patient is a 63y.o. male admitted on 10/10/2026 for cellulitis of scalp, kerion of occipital region of scalp, and "
            "chest pain. Demographics confirmed. Patients address on file is his mailing address, patient is unhoused. Per "
            "patient he is mostly independent and owns a cane and blood pressure machine as DME. No HH/SNF history. The patient "
            "reports he has both depression and anxiety that is managed by medication and a psychiatrist. Patient reports it "
            "works well for him and he has an appt this coming week. Patient declined additional mental health resources. "
            "Patient reports he drinks alcohol but did not want to disclose exact amounts. Per patient, he drinks daily. SW "
            "offered substance use resources, patient accepted. SW offered community and shelter resources, patient accepted.",
            "SW reviewed patients insurance, and offered IF RECUP referral - patient accepted. SW also offered assistance at DC "
            "to check shelters, patient in agreement. SW explained that we are not able to guarantee shelter placement at DC, "
            "patient understood.",
            "SW to return to bedside to resources.",
            "Pending DC orders and recommendations. DCP: community vs shelter placement.",
        ],
        "sw_addendum": "1:22pm: SW dropped resources at bedside. SW confirmed patients phone number and received permission to "
                       "provide his contact to Illumination Foundation.",
        "psychiatrist": "per patient - Dr. Nguyen through county BH - will see her this week",
        "labs": {"WBC": [13.2, 16.2, 17.0, 18.8, 13.9], "Hgb": [7.5, 7.1, 6.9, 7.7, 8.4], "Hct": [25.2, 24.6, 23.5, 26.8, 28.2],
                 "MCV": [59.1, 60.0, 59.9, 60.8, 61.2], "Plt": [416, 411, 396, 436, 452], "Na": [134, 135, 134, 135, 136],
                 "Glucose": [118, 97, 105, 110, 101]},
        "vitals_series": {"T": [36.8, 37.1, 36.9, 37.4, 36.6, 36.8, 37.0, 36.7, 36.9, 37.1],
                          "HR": [98, 92, 88, 86, 90, 84, 82, 88, 85, 80], "SBP": [165, 158, 150, 143, 149, 152, 147, 141, 138, 144],
                          "DBP": [75, 72, 70, 63, 68, 71, 66, 64, 62, 67], "RR": [18, 18, 19, 18, 17, 19, 18, 18, 16, 18],
                          "SpO2": [95, 96, 97, 99, 98, 97, 98, 99, 98, 97]},
        "lab_overrides": {"Ferritin": 9, "Iron": 22, "Hemoglobin A1c": 5.6},
        "font": 1,
    },
    # 2. Spanish-speaking woman, pneumonia / COPD exacerbation, walker, oral diabetes meds, no wound.
    {
        "slug": "002",
        "last": "REYES", "first": "DOLORES", "mi": "M", "sex": "Female", "age": 67, "dob": "07/09/1959",
        "mrn": "LP2208154", "account": "4403918275", "ssn4": "8092", "ssn": "XXX-XX-8092",
        "address": "No permanent address - staying in vehicle", "city": "Mission Viejo, CA 92691", "phone": "949-555-0126",
        "language": "Spanish", "english": False, "ethnicity": "Hispanic", "marital": "Widowed", "religion": "Catholic",
        "homeless": True, "homeless_long": False,
        "hospital": "Laguna Pines Medical Center", "hospital_short": "LAGUNA PINES MC",
        "hosp_addr": "27700 Medical Center Way, Mission Viejo, CA 92691", "hosp_phone": "949-555-0170", "hosp_fax": "949-555-0179",
        "hosp_npi": "1730045519", "unit": "3 North Telemetry", "bed": "318", "nursing_phone": "949-555-0172",
        "referrer": "Jordan Kim, RN Case Manager", "referrer_first": "Jordan", "referrer_phone": "949-555-0174",
        "referrer_email": "jkim@lagunapines.test", "authorized_by": "Dr. Alan Brooks", "authorized_phone": "949-555-0177",
        "admit": "10/09/2026", "admit_time": "10/09/2026 22:15", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Alan Brooks, MD", "attending": "Alan Brooks, MD", "referring_md": "Maria Esposito, MD",
        "pcp": "Rafael Duarte, MD", "pcp_phone": "949-555-0181", "pcp_addr": "26800 Crown Valley Pkwy, Mission Viejo, CA 92691",
        "consultant": "Hannah Weiss, MD", "consult_specialty": "Pulmonary Disease",
        "wound_rn": "Brian Castillo, PT, DPT", "sw": "Luz Navarro, LCSW", "hp_author": "Alan Brooks, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health OneCare (HMO D-SNP)", "member_id": "56473829B", "cin": "56473829B",
        "health_id": "CO-8092-5647", "group": "ONECARE", "aid_code": "1H", "guarantor_status": "RETIRED",
        "emergency": ("Marisol Reyes-Ortiz", "Daughter", "949-555-0133"),
        "chief_complaint": "SHORTNESS OF BREATH",
        "form_cc": "Community acquired pneumonia, COPD exacerbation, acute hypoxia (resolved)",
        "qual_dx": "Pneumonia, COPD exacerbation, DM2",
        "adm_dx": ["Pneumonia of right lower lobe due to infectious organism [J18.9]",
                   "COPD with (acute) exacerbation [J44.1]", "Acute respiratory failure with hypoxia [J96.01]"],
        "wound": False, "wound_desc": "", "wound_independent": None,
        "substances": {}, "withdrawals": False,
        "mh": [], "mh_type": "", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": True, "insulin": False, "anticoag": False,
        "ambulatory": True, "device": "front wheel walker", "car": True, "partner": False, "service_animal": False,
        "tb": ("10/11/2026", "Negative (CXR - no active TB)"), "communicable": "None - droplet isolation d/c'd 10/11",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "PT/OT Eval.", "SW notes"],
        "cover_msg": "Please find attached referral packet for Recuperative Care. Patient has been weaned to room air and is "
                     "transitioning to oral antibiotics today. PT evaluation is attached; patient ambulates with front wheel "
                     "walker. Patient is Spanish speaking; daughter can assist with communication. Anticipated discharge "
                     "10/15/2026. Please call with any questions.",
        "pmh": ["COPD (chronic obstructive pulmonary disease)", "Type 2 diabetes mellitus without complication",
                "Essential hypertension", "Osteoarthritis of both knees", "Former tobacco use (quit 2019)"],
        "psh": "Cholecystectomy (2008). Right knee arthroscopy (2016).",
        "sched_meds": ["metFORMIN, 500 mg, Oral, BID with meals", "lisinopril, 10 mg, Oral, Daily",
                       "tiotropium (Spiriva Respimat) 2.5 mcg/actuation, 2 puff, Inhalation, Daily",
                       "budesonide-formoterol (Symbicort) 160-4.5 mcg, 2 puff, Inhalation, BID",
                       "predniSONE, 40 mg, Oral, Daily (day 5 of 5)",
                       "cefTRIAXone (Rocephin) 1 g in sodium chloride 0.9% 50 mL IVPB, 1 g, IntraVENOUS, Q24H",
                       "azithromycin (Zithromax), 500 mg, Oral, Daily", "enoxaparin (Lovenox), 40 mg, SubCUTAneous, Daily"],
        "prn_meds": ["albuterol 2.5 mg/3 mL nebulizer, 2.5 mg, Q4H PRN wheezing", "acetaminophen, 650 mg, Q6H PRN",
                     "guaiFENesin (Robitussin), 200 mg, Q4H PRN cough", "insulin lispro (HumaLOG), 0-6 Units, TID AC sliding scale"],
        "allergies": "Penicillins (Rash)",
        "alcohol": ("No", "0", "Never", "N/A", "Never"), "tobacco": "Former - quit 2019 (40 pack-years)", "drugs": "Never",
        "weight": "71.4 kg (157 lb)", "bmi": "29.7",
        "vitals_hp": {"BP": "152/84", "Pulse": "(!) 108", "Resp": "(!) 26", "Temp": "(!) 38.4 °C (101.1 °F)", "SpO2": "(!) 86%"},
        "vitals_pn": {"BP": "134/76", "Pulse": "88", "Resp": "18", "Temp": "36.9 °C (98.4 °F)", "SpO2": "94% on room air"},
        "hp_hpi": "Dolores Reyes is a 67 years old female, Spanish speaking (history obtained with interpreter #40122), with COPD "
                  "and type 2 diabetes who presents with 4 days of worsening shortness of breath, productive cough with yellow "
                  "sputum, and subjective fevers. She has been sleeping in her car since losing her apartment in August and ran "
                  "out of her inhalers 2 weeks ago. EMS found her SpO2 84% on room air, improved to 92% on 3L NC. In our ER, "
                  "temp 38.4, WBC 15.8, lactate 1.6, procalcitonin 0.9. CXR with right lower lobe consolidation. She received "
                  "duonebs, methylprednisolone 125 mg IV and ceftriaxone/azithromycin.",
        "problems": ["Community acquired pneumonia, RLL", "COPD exacerbation", "Acute hypoxic respiratory failure",
                     "DM2 (A1c 7.8)", "HTN", "Homelessness"],
        "plan_lines": ["--- Ceftriaxone + azithromycin, f/u blood/sputum cx", "--- Prednisone 40 mg x5 days, scheduled nebs, wean O2",
                       "--- Hold metformin while inpatient, SSI", "--- PT/OT eval, SW/CM for discharge planning."],
        "pn_update": "10/13: Weaned to room air at rest, SpO2 92-94%, ambulatory desat to 89% improved with pursed-lip breathing. "
                     "Transition to cefpodoxime 200 mg PO BID to complete 7 days. Pulm OK for dc. Resume home inhalers.",
        "pn_interval": "Pt feeling much better, cough improving, ambulated in hallway with PT.",
        "exam_extra": "Scattered expiratory wheezes, diminished R base.",
        "doc2_kind": "pt",
        "doc2": {
            "subjective": "Pt seen for PT evaluation with Spanish interpreter (iPad #40122). Pt reports she was independent "
                          "without device prior to admission, walks with a cane \"some days\" for knee pain. Lives in her car; "
                          "daughter lives in Riverside and is not able to house pt.",
            "objective": ["Pt seated in chair, alert and oriented x4, on room air, SpO2 95% at rest",
                          "Bed mobility: Supervision", "Sit to stand: Contact guard assist from chair, Supervision with FWW",
                          "Gait: 150 ft with front wheel walker, supervision, 1 standing rest break; SpO2 89% after "
                          "ambulation, recovered to 93% within 1 min with pursed-lip breathing",
                          "Stairs: 4 steps with handrail, contact guard assist",
                          "Balance: Tinetti 19/28 - moderate fall risk"],
            "location": "", "measure": "", "undermining": "", "tunneling": "", "bed": "", "periwound": "", "drainage": "",
            "care": "",
            "plan": "Recommend front wheel walker for all ambulation (DME ordered). Pt safe to discharge to a supportive "
                    "setting such as recuperative care; not safe to return to living in vehicle. No skilled HH PT needs if "
                    "placed in recuperative care. Pt educated on energy conservation and pursed-lip breathing; verbalized "
                    "understanding via interpreter.",
        },
        "consult": {
            "reason": "I was asked to see the patient for management of COPD exacerbation and pneumonia",
            "cc": "Shortness of breath",
            "hpi": "67 yo female with COPD (no PFTs on file, 40 pack-year history, quit 2019) admitted with RLL pneumonia and COPD "
                   "exacerbation with hypoxia requiring up to 4L NC on admission. She has had 2 prior exacerbations this year "
                   "treated at urgent care. She has been without maintenance inhalers for 2 weeks because her medications were "
                   "stolen from her car. No home oxygen. Now on room air at rest.",
            "ros": "Respiratory: Positive for cough and shortness of breath, improving.",
            "exam": ["General: Elderly female sitting in chair, speaking full sentences", "HEENT: Moist mucous membranes",
                     "Neck: No JVD", "Chest: Scattered expiratory wheezes, diminished R base, no accessory muscle use",
                     "Cardiovascular: Regular rate rhythm, no murmur", "Abdomen: Soft, non tender",
                     "Extremities: Trace bilateral ankle edema"],
            "imaging": [("X-Ray Chest 2 Views", "10/09/2026", "Right lower lobe consolidation compatible with pneumonia. "
                         "Hyperinflation consistent with COPD. No effusion."),
                        ("X-Ray Chest 2 Views", "10/12/2026", "Improving right lower lobe airspace disease."),
                        ("CTA Chest Pulmonary Embolism", "10/10/2026", "No pulmonary embolism. RLL consolidation. "
                         "Centrilobular emphysema.")],
            "assessment": ["-Acute exacerbation of COPD triggered by community acquired pneumonia, improving",
                           "-Acute hypoxic respiratory failure, resolved - room air at rest, borderline with exertion",
                           "-Medication access barrier: no maintenance inhalers x2 weeks"],
            "plan": ["-complete prednisone 40 mg x 5 days, no taper needed", "-transition to cefpodoxime 200 mg PO BID to "
                     "complete 7 days total antibiotics (PCN allergy - rash only, tolerating ceftriaxone)",
                     "-resume tiotropium + budesonide-formoterol; meds to beds prior to discharge with spacer teaching",
                     "-ambulatory O2 study done: does not qualify for home O2", "-outpatient PFTs and pulmonary f/u 4-6 weeks",
                     "-ok for discharge from pulmonary standpoint; recuperative care strongly recommended",
                     "-this was discussed with the patient via interpreter and her daughter by phone."],
        },
        "sw_note": [
            "SW consulted for discharge planning / housing insecurity.",
            "Patient is a 67y.o. female admitted on 10/09/2026 for pneumonia and COPD exacerbation. Interview completed in "
            "Spanish. Patient reports she lost her apartment in Mission Viejo in August 2026 after rent increase and has been "
            "sleeping in her 2011 Honda Civic in a church parking lot. This is her first episode of homelessness. Daughter "
            "Marisol lives in Riverside in a 1-bedroom with 3 children and is unable to house pt. Pt is independent with ADLs, "
            "uses a walker per PT. No mental health history, denies alcohol or drug use.",
            "SW reviewed insurance (CalOptima OneCare) and offered IF RECUP referral - patient and daughter in agreement. SW "
            "also provided CalOptima Housing Navigation and Coordinated Entry information. SW explained that we are not able to "
            "guarantee shelter placement at DC, patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care.",
        ],
        "sw_addendum": "3:05pm: SW faxed referral to Illumination Foundation. Daughter Marisol (949-555-0133) given permission "
                       "to be contacted regarding placement.",
        "psychiatrist": "n/a",
        "labs": {"WBC": [15.8, 14.1, 12.2, 10.4, 9.1], "Hgb": [12.4, 11.9, 11.7, 12.0, 12.2],
                 "Hct": [37.8, 36.0, 35.4, 36.4, 37.0], "MCV": [88.2, 87.9, 88.4, 88.0, 88.1], "Plt": [298, 284, 301, 322, 340],
                 "Na": [137, 136, 138, 139, 138], "Glucose": [244, 286, 231, 198, 176]},
        "vitals_series": {"T": [38.4, 38.1, 37.6, 37.2, 37.0, 36.8, 36.9, 36.7, 36.9, 36.8],
                          "HR": [108, 104, 98, 94, 92, 90, 88, 86, 88, 84], "SBP": [152, 148, 141, 138, 134, 136, 132, 130, 134, 128],
                          "DBP": [84, 80, 78, 76, 76, 74, 72, 70, 76, 72], "RR": [26, 24, 22, 20, 20, 18, 18, 18, 18, 17],
                          "SpO2": [86, 91, 93, 94, 93, 94, 95, 94, 94, 95]},
        "lab_overrides": {"Hemoglobin A1c": 7.8, "CRP": 4.8, "Procalcitonin": 0.9, "Ferritin": 140, "Iron": 70,
                          "BNP": 88, "D-Dimer": 0.48},
        "font": 0,
    },
    # 3. Diabetic foot osteomyelitis after partial ray amputation; insulin, meth use, PTSD, post-op shoe + walker.
    {
        "slug": "003",
        "last": "BANKS", "first": "TERRENCE", "mi": "L", "sex": "Male", "age": 54, "dob": "11/30/1971",
        "mrn": "WB00639127", "account": "220917634", "ssn4": "2305", "ssn": "XXX-XX-2305",
        "address": "General Delivery", "city": "Westminster, CA 92683", "phone": "657-555-0148",
        "language": "English", "english": True, "ethnicity": "White", "marital": "Divorced", "religion": "None",
        "homeless": True, "homeless_long": True,
        "hospital": "Westminster Bay Hospital", "hospital_short": "WESTMINSTER BAY HOSP",
        "hosp_addr": "15300 Bay Hospital Blvd, Westminster, CA 92683", "hosp_phone": "657-555-0110",
        "hosp_fax": "657-555-0119", "hosp_npi": "1932267701", "unit": "5 South Ortho/Surgical", "bed": "521-A",
        "nursing_phone": "657-555-0115",
        "referrer": "Keisha Doyle, LCSW", "referrer_first": "Keisha", "referrer_phone": "657-555-0112",
        "referrer_email": "kdoyle@westminsterbay.test", "authorized_by": "Dr. Victor Huang", "authorized_phone": "657-555-0116",
        "admit": "10/07/2026", "admit_time": "10/07/2026 11:03", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Victor Huang, MD", "attending": "Victor Huang, MD", "referring_md": "Elise Park, DPM",
        "pcp": "None on file - assigned to Westminster Community Clinic", "pcp_phone": "657-555-0190",
        "pcp_addr": "14200 Goldenwest St, Westminster, CA 92683",
        "consultant": "Farid Haddadi, MD", "consult_specialty": "Infectious Diseases",
        "wound_rn": "Angela Moss, RN, CWCN", "sw": "Keisha Doyle, LCSW", "hp_author": "Victor Huang, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health Medi-Cal", "member_id": "33012984C", "cin": "33012984C",
        "health_id": "CO-2305-3301", "group": "MCAL-OC", "aid_code": "L1", "guarantor_status": "UNEMPLOYED",
        "emergency": ("No Contact Specified", "", ""),
        "chief_complaint": "FOOT WOUND",
        "form_cc": "R foot diabetic ulcer w/ osteomyelitis 5th metatarsal, s/p partial 5th ray amputation 10/9",
        "qual_dx": "Osteomyelitis R foot s/p amputation, DM2 uncontrolled, post-op wound",
        "adm_dx": ["Diabetic foot ulcer, right foot, with osteomyelitis [E11.621, L97.514]",
                   "Acute osteomyelitis, right foot [M86.171]", "Type 2 diabetes mellitus with hyperglycemia [E11.65]"],
        "wound": True, "wound_desc": "R lateral foot surgical wound 4.0 x 1.8 x 0.6 cm, stage n/a", "wound_independent": False,
        "substances": {"Meth": "09/28/2026", "Alcohol": "08/2026"}, "withdrawals": False,
        "mh": ["Trauma-related"], "mh_type": "PTSD", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": True, "insulin": True, "anticoag": False,
        "ambulatory": True, "device": "walker + post-op shoe, heel weight bearing", "car": False, "partner": False,
        "service_animal": False,
        "tb": ("10/08/2026", "Negative (QuantiFERON)"), "communicable": "MRSA nares + (contact precautions)",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "Surgical notes", "SW notes"],
        "cover_msg": "Referral for recuperative care for patient s/p right partial 5th ray amputation. ID has transitioned "
                     "patient to oral antibiotics (no PICC). Patient will need daily dressing changes; home health wound care "
                     "has been ordered through Coastline Home Health and can follow patient at recuperative care. Podiatry f/u "
                     "scheduled 10/21. Anticipated discharge 10/15/2026.",
        "pmh": ["Type 2 diabetes mellitus with hyperglycemia", "Diabetic peripheral neuropathy", "PTSD",
                "Methamphetamine use disorder, mild", "Hepatitis C, treated 2022 (SVR)", "Hyperlipidemia"],
        "psh": "Right partial 5th ray amputation (10/09/2026, Dr. Elise Park, DPM). Left index finger laceration repair (2015).",
        "sched_meds": ["insulin glargine (Lantus), 22 Units, SubCUTAneous, Nightly",
                       "insulin lispro (HumaLOG), 0-10 Units, SubCUTAneous, TID AC sliding scale", "metFORMIN, 1,000 mg, Oral, BID",
                       "atorvastatin, 40 mg, Oral, Daily", "gabapentin, 300 mg, Oral, TID", "sertraline, 50 mg, Oral, Daily",
                       "doxycycline hyclate, 100 mg, Oral, BID", "levoFLOXacin (Levaquin), 750 mg, Oral, Daily",
                       "nicotine 21 mg/24 hr patch, 1 patch, TransDERMal, Daily"],
        "prn_meds": ["oxyCODONE, 5 mg, Q6H PRN moderate pain", "acetaminophen, 1,000 mg, Q8H PRN", "glucose 4 g chewable, 16 g, PRN BG<70",
                     "traZODone, 50 mg, HS PRN sleep"],
        "allergies": "Sulfa (Sulfonamide Antibiotics) - Hives",
        "alcohol": ("Not Currently", "0", "Never", "N/A", "Never"), "tobacco": "Current Every Day Smoker - 1/2 ppd",
        "drugs": "Yes - Methamphetamine, smoked, last use 09/28/2026",
        "weight": "88.5 kg (195 lb)", "bmi": "27.2",
        "vitals_hp": {"BP": "(!) 148/92", "Pulse": "(!) 104", "Resp": "18", "Temp": "(!) 38.2 °C (100.8 °F)", "SpO2": "98%"},
        "vitals_pn": {"BP": "128/80", "Pulse": "78", "Resp": "16", "Temp": "36.7 °C (98.1 °F)", "SpO2": "98%"},
        "hp_hpi": "Terrence Banks is a 54 years old male with poorly controlled type 2 diabetes (A1c 11.4) and neuropathy who "
                  "presents with a draining wound on the outside of his right foot for 3 weeks, worse over the last 4 days with "
                  "redness up to the ankle and foul odor. He has been living on the street near Little Saigon and walking in "
                  "ill-fitting shoes. He has not taken insulin in about a month. In our ER, temp 38.2, WBC 17.4, glucose 386, "
                  "ESR 92, CRP 14.1. X-ray right foot showed cortical erosion of the 5th metatarsal head. MRI confirmed "
                  "osteomyelitis of the 5th metatarsal head and proximal phalanx without abscess.",
        "problems": ["Diabetic foot infection with osteomyelitis R 5th MT", "DM2 uncontrolled with hyperglycemia",
                     "Peripheral neuropathy", "Methamphetamine use", "PTSD", "Homelessness"],
        "plan_lines": ["--- Vancomycin + cefepime + metronidazole IV, f/u bone cx", "--- Podiatry consult for I&D vs amputation",
                       "--- Basal/bolus insulin, diabetes education, A1c", "--- ID consult, SW for dc planning."],
        "pn_update": "10/13: POD#4 s/p R partial 5th ray amputation, margins clean per path. Bone cx MSSA + strep agalactiae. "
                     "ID switched to PO doxycycline + levofloxacin x 6 wks total. BG 120-190 on Lantus 22u. Stable for dc to "
                     "recuperative care w/ HH wound care.",
        "pn_interval": "Pt pain controlled on PO meds, ambulating heel weight bearing with walker.",
        "exam_extra": "R foot: dressing C/D/I, post-op shoe in place.",
        "doc2_kind": "wound",
        "doc2": {
            "subjective": "Per H&P- 54 years old male with uncontrolled DM2 and neuropathy admitted with R foot diabetic ulcer "
                          "and osteomyelitis of 5th metatarsal, now POD#4 s/p R partial 5th ray amputation by podiatry (Dr. Park) "
                          "on 10/09/2026. Patient reports pain 3/10, states \"I can't really feel my foot anyway.\"",
            "objective": ["Patient awake, alert, cooperative with dressing change", "Bone culture: MSSA and Streptococcus "
                          "agalactiae (group B)", "Pathology: acute osteomyelitis, proximal margin negative",
                          "Allergies: Sulfa (hives)"],
            "location": "RIGHT LATERAL FOOT (5TH RAY AMPUTATION SITE)", "measure": "4.0 X 1.8 X 0.6 cm",
            "undermining": "None", "tunneling": "None", "bed": "70% red granulation, 30% yellow fibrin",
            "periwound": "intact, mild maceration", "drainage": "small serosanguinous",
            "care": "Cleansed with normal saline, skin prep to periwound, packed lightly with calcium alginate, covered with "
                    "ABD and kerlix, secured with tape. Post-op shoe reapplied.",
            "plan": "Daily dressing change: cleanse with NS, skin prep periwound, calcium alginate to wound bed, ABD and kerlix. "
                    "Heel weight bearing only in post-op shoe with walker. Patient NOT independent with wound care (unable to "
                    "visualize lateral foot) - home health RN ordered for daily dressing changes. Podiatry f/u 10/21/2026.",
        },
        "consult": {
            "reason": "I was asked to see the patient for antibiotic management of diabetic foot osteomyelitis",
            "cc": "Right foot wound",
            "hpi": "54 yo male with uncontrolled DM2, neuropathy, meth use, treated hepatitis C, admitted 10/07 with R lateral foot "
                   "ulcer probing to bone, MRI with osteomyelitis of 5th metatarsal head and proximal phalanx. Started on "
                   "empiric vancomycin, cefepime and metronidazole. Underwent R partial 5th ray amputation 10/09 with bone "
                   "culture growing MSSA and Group B strep. Proximal margin negative for osteomyelitis on pathology. MRSA nares "
                   "positive. Patient is homeless and reports injection drug use in the past (none since 2021) - PICC line not "
                   "favored.",
            "ros": "Skin: Positive for wound. MSK: R foot pain.",
            "exam": ["General: Awake alert no acute distress", "HEENT: Poor dentition", "Neck: Supple",
                     "Chest: Clear breath sounds bilaterally", "Cardiovascular: Regular rate rhythm, no murmur",
                     "Abdomen: Soft no guarding", "Extremities: R foot dressing clean dry intact, no erythema proximal to "
                     "dressing; diminished monofilament sensation bilateral feet"],
            "imaging": [("X-Ray Foot Right 3 Views", "10/07/2026", "Cortical erosion of the 5th metatarsal head concerning for "
                         "osteomyelitis. Soft tissue swelling and gas lateral forefoot."),
                        ("MRI Foot Right WO/W Contrast", "10/08/2026", "Osteomyelitis of the 5th metatarsal head and proximal "
                         "phalanx. Plantar lateral ulcer with sinus tract. No drainable abscess."),
                        ("X-Ray Foot Right 3 Views", "10/10/2026", "Interval partial 5th ray amputation. Expected post-op changes.")],
            "assessment": ["-Diabetic foot osteomyelitis R 5th MT s/p partial ray amputation with clean proximal margin",
                           "-Bone culture MSSA + Group B strep", "-MRSA nares colonization",
                           "-Uncontrolled DM2 (A1c 11.4), homelessness, stimulant use - high risk for nonadherence"],
            "plan": ["-stop vancomycin, cefepime and metronidazole", "-start doxycycline 100 mg PO BID + levofloxacin 750 mg PO "
                     "daily (sulfa allergy - avoid TMP-SMX)", "-total duration 3 weeks from surgery given clean margin; "
                     "reassess at ID clinic 10/28", "-no PICC indicated", "-weekly CBC, CMP, CRP via home health",
                     "-strongly recommend recuperative care for wound healing and glycemic control",
                     "-this was discussed with the patient, podiatry and the nurse."],
        },
        "sw_note": [
            "SW consulted for homelessness and substance use.",
            "Patient is a 54y.o. male admitted on 10/07/2026 for R foot diabetic infection, now s/p partial 5th ray amputation. "
            "Patient reports he has been homeless on and off for 6 years, most recently on the street in Westminster for 14 "
            "months. Receives mail at General Delivery. Patient reports PTSD from military contractor work overseas; not "
            "currently in treatment, open to referral. Reports smoking methamphetamine \"a couple times a week\", last use "
            "09/28/2026; not interested in residential treatment but accepted outpatient SUD resources. Denies alcohol since "
            "August.",
            "SW reviewed insurance (CalOptima Medi-Cal) and offered IF RECUP referral - patient accepted, states \"I need "
            "somewhere to keep this foot clean.\" Coastline Home Health accepted for wound care. SW explained that we are not "
            "able to guarantee placement at DC, patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care with HH wound care.",
        ],
        "sw_addendum": "10:40am: SW provided bus pass and CalOptima BH line number. Patient gave permission to share contact "
                       "information with Illumination Foundation.",
        "psychiatrist": "None - referred to CalOptima Behavioral Health 855-555-0122",
        "labs": {"WBC": [17.4, 15.2, 12.8, 10.9, 9.6], "Hgb": [13.1, 12.4, 11.6, 11.2, 11.5], "Hct": [39.4, 37.2, 35.0, 33.9, 34.6],
                 "MCV": [86.0, 85.7, 86.2, 86.4, 86.1], "Plt": [388, 362, 341, 330, 318], "Na": [131, 133, 135, 136, 137],
                 "Glucose": [386, 274, 212, 168, 141]},
        "vitals_series": {"T": [38.2, 38.0, 37.5, 37.9, 37.2, 36.9, 37.0, 36.8, 36.7, 36.8],
                          "HR": [104, 100, 96, 98, 90, 84, 82, 80, 78, 78], "SBP": [148, 142, 138, 140, 132, 130, 128, 126, 128, 124],
                          "DBP": [92, 88, 86, 84, 82, 80, 80, 78, 80, 76], "RR": [18, 18, 17, 18, 16, 16, 16, 17, 16, 16],
                          "SpO2": [98, 97, 98, 97, 98, 98, 99, 98, 98, 98]},
        "lab_overrides": {"Hemoglobin A1c": 11.4, "CRP": 14.1, "Sed Rate (ESR)": 92, "Ferritin": 310, "Iron": 60,
                          "Lactic Acid": 1.9},
        "font": 2,
    },
]
